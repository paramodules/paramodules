import {
    use,
    createContext as createReactContext,
    type Context,
    type ReactNode
} from "react"
import {
    type Param,
    type Supplier,
    type UnknownModule,
    type UnknownService,
    service as coreService
} from "paramodules"

type WithContext<P extends Param> = P & {
    _context: Context<Supplier<P> | undefined>
}

type MaybeWithContext<S extends UnknownService> = S & {
    _context?: Context<Supplier<S> | undefined>
}

type MaybeWithContextSupplier<S extends UnknownService> = Omit<
    Supplier<S>,
    "service"
> & {
    service: MaybeWithContext<S>
}

type Prettify<T> = { [K in keyof T]: T[K] }

/** Param suppliers accepted by {@link ParamsProvider} for a subtree (all optional). */
export type Params<M extends UnknownModule> = Prettify<{
    [K in keyof M["_reqType"] as NonNullable<M["_reqType"][K]> extends (
        Supplier<infer SERVICE>
    ) ?
        SERVICE extends Param ?
            K
        :   never
    :   never]?: M["_reqType"][K]
}>

export function withContext<P extends Param>(param: P): WithContext<P> {
    return {
        ...param,
        _context: createReactContext<Supplier<P> | undefined>(undefined)
    }
}

export function service<TM extends string>(tm: TM) {
    return {
        ...coreService(tm),
        param<TYPE = any>() {
            return withContext(coreService(tm).param<TYPE>())
        }
    }
}

export function useSupplies<
    M extends UnknownModule & {
        _required: MaybeWithContext<UnknownService>[]
        _optionals: MaybeWithContext<UnknownService>[]
    }
>(module: M, initSupplies: Record<string, unknown>): M["_suppliesType"] {
    const supplies: Record<string, unknown> = {}

    for (const service of [...module._required, ...module._optionals]) {
        if (!service._context) {
            supplies[service.tm] = initSupplies[service.tm]
            continue
        }
        const context = use(service._context)
        supplies[service.tm] = context?.get() ?? initSupplies[service.tm]
    }

    return supplies as M["_suppliesType"]
}

/**
 * Opens a param scope for a subtree. The `for` module is used only to type
 * `value` (which params this subtree accepts) — its value is never resolved.
 * Each provided param is broadcast through its React context to descendants
 * that read it via {@link useSupplies}.
 */
export function ParamsProvider<M extends UnknownModule>({
    params,
    children
}: {
    for: M
    params: Params<M>
    children: ReactNode
}): ReactNode {
    const providers: Array<[Context<any>, unknown]> = []

    for (const value of Object.values(params as Record<string, unknown>)) {
        const supplier = value as
            | MaybeWithContextSupplier<UnknownService>
            | undefined
        const context = supplier?.service._context
        if (!context) continue
        providers.push([context, supplier])
    }

    return providers.reduceRight<ReactNode>(
        (tree, [context, supplier]) => (
            <context.Provider value={supplier}>{tree}</context.Provider>
        ),
        children
    )
}

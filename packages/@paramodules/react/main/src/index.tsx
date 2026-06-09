import { useContext, type Context, type JSX, type ReactNode } from "react"
import type { Ctx, Supplier, UnknownModule, UnknownService } from "paramodules"
import { createContext as createReactContext } from "react"

type MaybeWithContextSupplier<S extends UnknownService> = Omit<
    Supplier<S>,
    "service"
> & {
    service: MaybeWithContext<S>
}

type MaybeWithContext<S extends UnknownService> = S & {
    _context?: Context<MaybeWithContextSupplier<S> | undefined>
}

export function withContext<S extends UnknownService>(service: S) {
    return {
        ...service,
        _context: createReactContext<MaybeWithContextSupplier<S> | undefined>(
            undefined
        )
    }
}

type MaybeWithContextMarketRecord = Record<
    string,
    MaybeWithContextSupplier<UnknownService>
>

export function useSupplies<
    M extends MaybeWithContext<
        UnknownModule & {
            _required: MaybeWithContext<UnknownService>[]
            _optionals: MaybeWithContext<UnknownService>[]
        }
    >
>(module: M, initSupplies: Record<string, unknown>): M["_suppliesType"] {
    const supplies: Record<string, unknown> = {}

    for (const service of [...module._required, ...module._optionals]) {
        if (!service._context) {
            supplies[service.tm] = initSupplies[service.tm]
            continue
        }
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const context = useContext(service._context)
        supplies[service.tm] = context?.get() ?? initSupplies[service.tm]
    }

    return supplies as M["_suppliesType"]
}

export function useProvide<M extends MaybeWithContext<UnknownModule>>(
    module: M,
    initCtx: Ctx<M>
) {
    const initCallerMarket = initCtx(module)._caller.market

    const callerMarket = Object.entries(
        initCallerMarket as MaybeWithContextMarketRecord
    ).reduce((acc, [tm, supplier]) => {
        const context = supplier.service._context
        if (!context) {
            acc[tm] = supplier
            return acc
        }
        // eslint-disable-next-line react-hooks/rules-of-hooks
        acc[tm] = useContext(context) ?? supplier
        return acc
    }, {} as MaybeWithContextMarketRecord)

    return function provide<M2 extends MaybeWithContext<UnknownModule>, REQ>(
        module2: M2 & { _reqType: REQ }
    ) {
        const initCtxModule2 = initCtx(module2)
        const ctxModule2 = {
            ...initCtxModule2,
            _caller: {
                ...initCtxModule2._caller,
                market: callerMarket
            }
        }

        return {
            with(req: typeof initCtxModule2._reqType, children: ReactNode) {
                const supplier2 = ctxModule2.request(req)
                const providers: Array<
                    [Context<any>, MaybeWithContextSupplier<UnknownService>]
                > = []

                const supplier2Context = supplier2.service._context
                if (supplier2Context) {
                    providers.push([
                        supplier2Context,
                        supplier2 as MaybeWithContextSupplier<UnknownService>
                    ])
                }

                for (const subSupplier of Object.values(
                    supplier2.market
                ) as MaybeWithContextSupplier<UnknownService>[]) {
                    const context = subSupplier.service._context
                    if (!context) continue
                    providers.push([context, subSupplier])
                }

                return providers.reduceRight<ReactNode>(
                    (tree, [context, value]) => (
                        <context.Provider value={value}>
                            {tree}
                        </context.Provider>
                    ),
                    children
                )
            }
        }
    }
}

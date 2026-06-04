import { useContext, type Context, type ReactNode } from "react"
import type { Supply, UnknownService, UnknownTM } from "@marketjs/trademarks"
import { createContext as createReactContext } from "react"

export function createContext() {
    return createReactContext<unknown>(undefined)
}

/**
 * Reads a service's required and optional dependencies from React Context.
 *
 * Iterates `service._required` then `service._optionals` in declaration
 * order, calling `useContext` once for each entry that carries a `_context`.
 * Entries without `_context` are omitted from the returned object — they
 * must be accessed via the factory's deps argument instead.
 *
 * Each Context falls back to whatever default the user passed to
 * `createContext(...)` when defining the spec, so callers see typed values
 * even before any `Provide` is mounted above.
 */
export function useDeps<S extends UnknownService>(service: S): S["_deps"] {
    const deps: Record<string, unknown> = {}

    for (const dep of service._required) {
        const ctx = getContext(dep)
        if (!ctx) continue
        // eslint-disable-next-line react-hooks/rules-of-hooks
        deps[dep.name] = useContext(ctx)
    }

    for (const dep of service._optionals) {
        const ctx = getContext(dep)
        if (!ctx) continue
        // eslint-disable-next-line react-hooks/rules-of-hooks
        deps[dep.name] = useContext(ctx)
    }

    return deps as S["_deps"]
}

/**
 * Transforms an already-built `Supply` into a tree of React
 * `Context.Provider`s wrapping the result of `children(unpacked)`.
 *
 * Walks `supply.market` (plus the top supply itself) and stacks one
 * `Context.Provider` per resolved entry that carries a `_context`. Entries
 * without `_context` are silently skipped.
 *
 * `children` is a render callback that receives the unpacked top supply,
 * letting callers compose without a separate `supply.unpack()` line. If the
 * unpacked value isn't needed (e.g. building a sub-supply from inside its
 * own component), just ignore the argument: `{() => <div>...</div>}`.
 *
 * Provide does no resolution of its own — call `service.buy(...)` (or
 * `ctx(service).buy(...)` for a contextualized sub-build) outside and pass
 * the resulting supply in. Spec defaults come from whatever each
 * `_context` was created with.
 */
export function Provide<S extends UnknownService>({
    supply,
    children
}: {
    supply: Supply<S>
    children: (unpacked: S["_type"]) => ReactNode
}): ReactNode {
    const providers: Array<[Context<unknown>, unknown]> = []
    const unpacked = supply.unpack()

    const topContext = getContext(supply.tm)
    if (topContext) {
        providers.push([topContext, unpacked])
    }

    for (const subSupply of Object.values(supply.market)) {
        const ctx = getContext(subSupply.tm)
        if (!ctx) continue
        providers.push([ctx, subSupply.unpack()])
    }

    return providers.reduceRight<ReactNode>(
        (tree, [Ctx, value]) => (
            <Ctx.Provider value={value}>{tree}</Ctx.Provider>
        ),
        children(unpacked)
    )
}

function getContext(tm: UnknownTM): Context<unknown> | undefined {
    return tm._context as Context<unknown> | undefined
}

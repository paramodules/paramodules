import { useLayoutEffect, useState, useSyncExternalStore } from "react"
import type { UnknownAppService, Supply, Service } from "typectx"

export function useDeps<INIT_DEPS extends Record<string, unknown>>(
    initDeps: INIT_DEPS
) {
    // useSyncExternalStore subscribes to store updates.
    // Combined with the two-phase update in useAssembleComponent (silent set + deferred trigger),
    // all components get single render pass regardless of memoization.
    if (!store.has(initDeps)) {
        store.set(initDeps, initDeps)
    }
    const deps = useSyncExternalStore(
        (listener) => store.subscribe(initDeps, listener),
        () => store.get(initDeps),
        () => initDeps
    ) as INIT_DEPS
    return deps ?? initDeps
}

export function useAssembleComponent<SERVICE extends UnknownAppService>(
    service: SERVICE,
    supplied: SERVICE["_toSupply"]
) {
    // First render captures the initial assembly.
    // Child components won't be in `components` until they've mounted and
    // initialized their store.
    const [first] = useState(() => service.assemble(supplied))

    function isAppSupply(
        supply: Supply<Service>
    ): supply is Supply<UnknownAppService> {
        return "_app" in supply.service && supply.service._app === true
    }

    const components = Object.entries(first.supplies).reduce(
        (acc, [key, supply]) => {
            if (!isAppSupply(supply)) return acc
            if (store.has(supply.deps)) return { ...acc, [key]: supply }
            return acc
        },
        store.has(first.deps) ?
            ({
                [first.service.name]: first
            } as Record<string, Supply<UnknownAppService>>)
        :   ({} as Record<string, Supply<UnknownAppService>>)
        // Assertion necessary because intersection of mapped types do not work well with wide types
    )

    const triggered = Object.entries(components)
        .map(([key, component]) => {
            if (
                // This is not the team! Team is transitive, this is just the direct dependencies!
                ![
                    ...component.service._services,
                    ...component.service._optionals
                ].some(
                    (service) =>
                        service.name in supplied &&
                        supplied[service.name] !==
                            (store.get(component.deps)?.[service.name] ??
                                undefined)
                )
            )
                return

            store.set(
                component.deps,
                // We need ctx, because supplied here is not necessarily the same
                // as supplied in the useState() call. This is not necessarily the first render, so supplies here
                // may lack the ones provided in first render.
                first._ctx(component.service).assemble({
                    ...supplied,
                    ...components
                }).deps
            )

            return component
        })
        .filter((component) => component !== undefined)

    // Always only one render pass!
    // If component is memoed, then the synchronous render from parent will be skipped,
    // If component is not memoed, then the synchronous render from parent will be executed,
    // the snapshot will get updated, meaning the re-render from useLayoutEffect will be aborted.
    // Since snapshot has not changed since synchronous render.
    // Result: single render for all children, equivalent to React Context!
    useLayoutEffect(() => {
        triggered.forEach((component) => store.trigger(component.deps))
    })

    // Always return first for referential stability.
    // Updates to child components propagate via store.set() above,
    // which useInit$ reads via useSyncExternalStore.
    return first
}

export const useAssembleHook = useAssembleComponent

const store = {
    set(
        componentDeps: Record<string, unknown>,
        elementDeps: Record<string, unknown>
    ) {
        store._.state.set(componentDeps, elementDeps)
    },
    get(componentDeps: Record<string, unknown>) {
        return store._.state.get(componentDeps)
    },
    has(componentDeps: Record<string, unknown>) {
        return store._.state.has(componentDeps)
    },
    trigger(componentDeps: Record<string, unknown>) {
        store._.listeners.get(componentDeps)?.forEach((listener) => listener())
    },
    subscribe(componentDeps: Record<string, unknown>, listener: () => unknown) {
        store._.listeners.set(componentDeps, [
            ...(store._.listeners.get(componentDeps) ?? []),
            listener
        ])

        return () => {
            store._.listeners.set(
                componentDeps,
                store._.listeners
                    .get(componentDeps)
                    ?.filter((l) => l !== listener) ?? []
            )
        }
    },
    _: {
        state: new WeakMap<Record<string, unknown>, Record<string, unknown>>(),
        listeners: new WeakMap<Record<string, unknown>, (() => unknown)[]>()
    }
}

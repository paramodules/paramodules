import type { Cacher } from "paramodules"

type CacheLike = {
    get: (key: string) => unknown
    set: (key: string, value: unknown) => void
    has: (key: string) => boolean
}

export function create(store: CacheLike): Cacher {
    return <TYPE>(factoryRunner: () => TYPE, cacheKey: string) => {
        return () => {
            if (!store.has(cacheKey)) {
                store.set(cacheKey, factoryRunner())
            }
            return store.get(cacheKey) as TYPE
        }
    }
}

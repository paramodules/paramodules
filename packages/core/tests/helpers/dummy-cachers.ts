import type { AsyncCacher, Cacher } from "#types/public"

type CacheStore = {
    get: (key: string) => unknown
    set: (key: string, value: unknown) => void
    has: (key: string) => boolean
}

function createStore(): CacheStore {
    const values = new Map<string, unknown>()
    return {
        get: (key) => values.get(key),
        set: (key, value) => {
            values.set(key, value)
        },
        has: (key) => values.has(key)
    }
}

/** Minimal in-memory sync cacher for core integration tests. */
export function dummySyncCacher(store: CacheStore = createStore()): Cacher {
    return <TYPE>(factoryRunner: () => TYPE, cacheKey: string) => {
        return () => {
            if (!store.has(cacheKey)) {
                store.set(cacheKey, factoryRunner())
            }
            return store.get(cacheKey) as TYPE
        }
    }
}

export const dummyAsyncCacher: (store?: CacheStore) => AsyncCacher =
    dummySyncCacher

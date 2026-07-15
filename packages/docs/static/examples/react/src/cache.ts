import { create as createResourceCacher } from "@paramodules/resource-cacher"
import { create as createValueCacher } from "@paramodules/value-cacher"

const lscache = {
    get: (key: string) => {
        return JSON.parse(localStorage.getItem(key) ?? "null")
    },
    set: (key: string, value: unknown) => {
        localStorage.setItem(key, JSON.stringify(value))
    },
    delete: (key: string) => {
        localStorage.removeItem(key)
    },
    has: (key: string) => {
        return localStorage.getItem(key) !== null
    }
}

export const lsCaching = {
    cacher: createResourceCacher({
        cache: lscache
    }),
    serializer: (value: unknown) => JSON.stringify(value)
}

export const memoryCaching = {
    cacher: createValueCacher(new Map()), // Caches JSX Promises directly to enable Suspense
    serializer: (value: unknown) => JSON.stringify(value)
}

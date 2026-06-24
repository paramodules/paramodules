import { create as createAsyncCacher } from "@paramodules/async-cacher"

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

export const asyncCaching = {
    cacher: createAsyncCacher({
        cache: lscache
    }),
    serializer: (value: unknown) => JSON.stringify(value)
}

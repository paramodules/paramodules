import { describe, expect, it, vi } from "vitest"
import { service } from "paramodules"
import { create as createAsyncCacher } from ".."

const basicKeySerializer = (value: unknown) => JSON.stringify(value)

function asyncCaching() {
    return {
        cacher: createAsyncCacher({
            cache: new Map(),
            ttl: 60_000
        }),
        serializer: basicKeySerializer
    }
}

describe("async cacher", () => {
    it("returns cached values for repeated async requests", async () => {
        const factory = vi.fn(async () => ({ id: Symbol("value") }))

        const $cached = service("asyncCached").module({
            factory,
            caching: asyncCaching()
        })

        const first = await $cached.request({}).get()
        const second = await $cached.request({}).get()

        expect(second).toBe(first)
        expect(factory).toHaveBeenCalledTimes(1)
    })

    it("invalidates transitive async cache keys when a dependency is invalidated", async () => {
        const leafFactory = vi.fn(async () => "leaf")
        const rootFactory = vi.fn(async ({ asyncLeaf }) => ({
            leaf: asyncLeaf,
            id: Symbol("async-root")
        }))

        const $asyncLeaf = service("asyncLeaf").module({
            factory: leafFactory,
            caching: asyncCaching()
        })

        const $asyncRoot = service("asyncRoot").module({
            required: [$asyncLeaf],
            factory: rootFactory,
            caching: asyncCaching()
        })

        const first = await $asyncRoot.request({}).get()
        const second = await $asyncRoot.request({}).get()

        expect(second).toBe(first)
        expect(leafFactory).toHaveBeenCalledTimes(1)
        expect(rootFactory).toHaveBeenCalledTimes(1)

        $asyncLeaf.invalidate()

        const third = await $asyncRoot.request({}).get()
        const fourth = await $asyncRoot.request({}).get()

        expect(third).not.toBe(first)
        expect(fourth).toBe(third)
        expect(leafFactory).toHaveBeenCalledTimes(2)
        expect(rootFactory).toHaveBeenCalledTimes(2)
    })
})

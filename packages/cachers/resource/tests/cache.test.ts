import { describe, expect, it, vi } from "vitest"
import { service } from "paramodules"
import { create as createResourceCacher } from ".."

const basicKeySerializer = (value: unknown) => JSON.stringify(value)

function resourceCaching() {
    return {
        cacher: createResourceCacher({
            cache: new Map(),
            ttl: 60_000
        }),
        serializer: basicKeySerializer
    }
}

describe("resource cacher", () => {
    it("returns cached values for repeated async requests", async () => {
        const factory = vi.fn(async () => ({ id: Symbol("value") }))

        const $cached = service("resourceCached")
            .module({
                factory
            })
            .caching(resourceCaching())

        const first = await $cached.request({}).get()
        const second = await $cached.request({}).get()

        expect(second).toBe(first)
        expect(factory).toHaveBeenCalledTimes(1)
    })

    it("invalidates transitive resource cache keys when a dependency is invalidated", async () => {
        const leafFactory = vi.fn(async () => "leaf")
        const rootFactory = vi.fn(async ({ resourceLeaf }) => ({
            leaf: resourceLeaf,
            id: Symbol("resource-root")
        }))

        const $resourceLeaf = service("resourceLeaf")
            .module({
                factory: leafFactory
            })
            .caching(resourceCaching())

        const $resourceRoot = service("resourceRoot")
            .module({
                required: [$resourceLeaf],
                factory: rootFactory
            })
            .caching(resourceCaching())

        const first = await $resourceRoot.request({}).get()
        const second = await $resourceRoot.request({}).get()

        expect(second).toBe(first)
        expect(leafFactory).toHaveBeenCalledTimes(1)
        expect(rootFactory).toHaveBeenCalledTimes(1)

        $resourceLeaf.invalidate()

        const third = await $resourceRoot.request({}).get()
        const fourth = await $resourceRoot.request({}).get()

        expect(third).not.toBe(first)
        expect(fourth).toBe(third)
        expect(leafFactory).toHaveBeenCalledTimes(2)
        expect(rootFactory).toHaveBeenCalledTimes(2)
    })

    it("works with required dependencies", () => {
        const $params = service("params").param<Record<string, string>>()

        service("inlineResourceWithRequired")
            .module({
                required: [$params],
                factory: async ({ params }) => params
            })
            .caching(resourceCaching())
    })
})

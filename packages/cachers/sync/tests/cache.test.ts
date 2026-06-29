import { describe, expect, it, vi } from "vitest"
import { service } from "paramodules"
import { create as createSyncCacher } from ".."

const basicKeySerializer = (value: unknown) => JSON.stringify(value)

function syncCaching() {
    return {
        cacher: createSyncCacher(new Map<string, unknown>()),
        serializer: basicKeySerializer
    }
}

describe("sync cacher", () => {
    it("returns cached values for repeated sync requests", () => {
        const factory = vi.fn(() => ({ id: Symbol("value") }))

        const $cached = service("cached")
            .module({
                factory
            })
            .caching(syncCaching())

        const first = $cached.request({}).get()
        const second = $cached.request({}).get()

        expect(second).toBe(first)
        expect(factory).toHaveBeenCalledTimes(1)
    })

    it("invalidates transitive sync cache keys when a dependency is invalidated", () => {
        const leafFactory = vi.fn(() => "leaf")
        const rootFactory = vi.fn(({ leaf }) => ({
            leaf,
            id: Symbol("root")
        }))

        const $leaf = service("leaf")
            .module({
                factory: leafFactory
            })
            .caching(syncCaching())

        const $root = service("root")
            .module({
                required: [$leaf],
                factory: rootFactory
            })
            .caching(syncCaching())

        const first = $root.request({}).get()
        const second = $root.request({}).get()

        expect(second).toBe(first)
        expect(leafFactory).toHaveBeenCalledTimes(1)
        expect(rootFactory).toHaveBeenCalledTimes(1)

        $leaf.invalidate()

        const third = $root.request({}).get()
        const fourth = $root.request({}).get()

        expect(third).not.toBe(first)
        expect(fourth).toBe(third)
        expect(leafFactory).toHaveBeenCalledTimes(2)
        expect(rootFactory).toHaveBeenCalledTimes(2)
    })

    it("keeps hired mocks with the same value in separate sync cache keys", () => {
        const rootFactory = vi.fn(({ dep }) => ({
            dep,
            id: Symbol("root")
        }))

        const $dep = service("dep").module({
            factory: () => "real"
        })

        const $mockDepA = $dep.mock({
            factory: () => "mock"
        })

        const $mockDepB = $dep.mock({
            factory: () => "mock"
        })

        const $root = service("rootWithMock")
            .module({
                required: [$dep],
                factory: rootFactory
            })
            .caching(syncCaching())

        const first = $root.hire($mockDepA).request({}).get()
        const second = $root.hire($mockDepB).request({}).get()

        expect(second).not.toBe(first)
        expect(second.dep).toBe(first.dep)
        expect(rootFactory).toHaveBeenCalledTimes(2)
    })
})

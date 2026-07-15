import { describe, expect, it, vi } from "vitest"
import { service } from "#index"
import { dummyValueCacher, dummyResourceCacher } from "./helpers/dummy-cachers"

const serializer = (value: unknown) => JSON.stringify(value)

const valueCaching = {
    cacher: dummyValueCacher(),
    serializer
}

const resourceCaching = {
    cacher: dummyResourceCacher(),
    serializer
}

describe("caching", () => {
    it("rejects invalidate() on modules without caching", () => {
        const $module = service("uncached").module({
            factory: () => "value"
        })

        expect(() => $module.invalidate()).toThrow(
            'Cannot invalidate "uncached" because invalidate() only applies to cached modules.'
        )
    })

    describe("value", () => {
        it("returns cached values for repeated requests", () => {
            const factory = vi.fn(() => ({ id: Symbol("value") }))

            const $cached = service("cached")
                .module({
                    factory
                })
                .caching(valueCaching)

            const first = $cached.request({}).get()
            const second = $cached.request({}).get()

            expect(second).toBe(first)
            expect(factory).toHaveBeenCalledTimes(1)
        })

        it("invalidates transitive value cache keys when a dependency is invalidated", () => {
            const leafFactory = vi.fn(() => "leaf")
            const rootFactory = vi.fn(({ leaf }) => ({
                leaf,
                id: Symbol("root")
            }))

            const $leaf = service("leaf")
                .module({
                    factory: leafFactory
                })
                .caching(valueCaching)

            const $root = service("root")
                .module({
                    required: [$leaf],
                    factory: rootFactory
                })
                .caching(valueCaching)

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

        it("keeps hired mocks with the same value in separate value cache keys", () => {
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
                .caching(valueCaching)

            const first = $root.hire($mockDepA).request({}).get()
            const second = $root.hire($mockDepB).request({}).get()

            expect(second).not.toBe(first)
            expect(second.dep).toBe(first.dep)
            expect(rootFactory).toHaveBeenCalledTimes(2)
        })
    })

    describe("resource", () => {
        it("returns cached values for repeated async requests", async () => {
            const factory = vi.fn(async () => ({ id: Symbol("value") }))

            const $cached = service("asyncCached")
                .module({
                    factory
                })
                .caching(resourceCaching)

            const first = await $cached.request({}).get()
            const second = await $cached.request({}).get()

            expect(second).toBe(first)
            expect(factory).toHaveBeenCalledTimes(1)
        })

        it("invalidates transitive resource cache keys when a dependency is invalidated", async () => {
            const leafFactory = vi.fn(async () => "leaf")
            const rootFactory = vi.fn(async ({ asyncLeaf }) => ({
                leaf: asyncLeaf,
                id: Symbol("async-root")
            }))

            const $asyncLeaf = service("asyncLeaf")
                .module({
                    factory: leafFactory
                })
                .caching(resourceCaching)

            const $asyncRoot = service("asyncRoot")
                .module({
                    required: [$asyncLeaf],
                    factory: rootFactory
                })
                .caching(resourceCaching)

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

        it("works with inline async factory and required deps", () => {
            const $params = service("params").param<Record<string, string>>()

            service("inlineAsyncWithRequired")
                .module({
                    required: [$params],
                    factory: async ({ params }) => params
                })
                .caching(resourceCaching)
        })
    })
})

import { describe, it, expect, vi, expectTypeOf } from "vitest"
import { index, tm } from "#index"
import { sleep, once } from "#utils"
import type {
    CircularDependencyError,
    DuplicateDependencyError
} from "#types/guards"
import type { Supply } from "#types/public"

describe("Mocks Feature", () => {
    describe("Mock Method", () => {
        it("should handle mock with less services", () => {
            const $input = tm("input").spec<boolean>()

            const $base = tm("base").service({
                required: [$input],
                factory: ({ input }) => ({ base: input })
            })

            const $mocked = $base.mock({
                required: [],
                factory: () => ({ base: true, enhanced: true })
            })

            const result = $mocked.buy({}).unpack()

            expect(result.base).toBe(true)
            expect(result.enhanced).toBe(true)
        })

        it("should not allow mocks in services array", () => {
            const $base = tm("mock").service({
                factory: () => "base"
            })

            const $mock = $base.mock({
                required: [],
                factory: () => "mock"
            })

            expect(() => {
                const $next = tm("next").service({
                    factory: () => "next",
                    //@ts-expect-error - mock in services array
                    required: [$mock]
                })
            }).toThrow()
        })

        it("should handle warmup setting in mock", async () => {
            const lazyProductSpy = vi.fn().mockReturnValue("lazy")
            const warmProductSpy = vi.fn().mockReturnValue("warm")

            const $lazy = tm("lazy").service({
                factory: () => once(lazyProductSpy)
            })

            const $warmMock = $lazy.mock({
                factory: () => once(warmProductSpy),
                warmup: (warmProduct) => warmProduct()
            })

            const $test = tm("test").service({
                required: [$lazy],
                factory: ({ lazy }) => lazy
            })

            $test.hire($warmMock).buy({})
            $test.buy({})

            await sleep(10)

            expect(lazyProductSpy).toHaveBeenCalledTimes(0)
            expect(warmProductSpy).toHaveBeenCalledTimes(1)
        })

        it("should compute precise TOSPECIFIY types with mock", () => {
            const $config = tm("config").spec<string>()
            const $apiKey = tm("apiKey").spec<string>()

            const $logger = tm("logger").service({
                factory: () => "logger"
            })

            // Base service - return compatible type that can be extended
            const $base = tm("base").service({
                factory: () => "base"
            })

            // mock with mixed request and app services
            const $mocked = $base.mock({
                required: [$config, $apiKey, $logger],
                factory: () => "proto"
            })

            $mocked.buy(
                //@ts-expect-error - missing $apiKey type supply
                index($config.of("test"))
            )

            $mocked.buy(
                //@ts-expect-error - missing $config type supply
                index($apiKey.of("secret-key"))
            )

            // The type system should now know exactly what needs to be supplied:
            // - config and apiKey (request supplies must be provided)
            // - logger should NOT need to be provided (it's an app service)
            const supply = $mocked.buy(
                index($config.of("test"), $apiKey.of("secret-key"))
            )

            const output = supply.unpack()
            expect(output).toBe("proto")
        })

        it("should detect circular dependencies in mocks", () => {
            const $A = tm("A").service({
                factory: () => "serviceA"
            })

            const $B = tm("B").service({
                required: [$A],
                factory: ({ A }) => "serviceB uses " + A
            })

            // Try to create circular dependency using mock
            // This should be caught by the circular dependency detection
            expect(() => {
                const $mockA = $A.mock({
                    required: [$B], // This creates a potential circle
                    factory: ({ B }) => "mockA uses " + B
                })

                expectTypeOf($mockA).toExtend<CircularDependencyError>()
            }).toThrow("Circular dependency detected")
        })
    })

    describe("Hire Method", () => {
        it("should allow hiring alternative services for testing", () => {
            const $db = tm("db").service({
                factory: () => "real-db"
            })

            const $cache = tm("cache").service({
                factory: () => "real-cache"
            })

            const $logger = tm("logger").service({
                factory: () => "real-logger"
            })

            const $service = tm("service").service({
                required: [$db, $cache, $logger],
                factory: ({ db, cache, logger }) => ({
                    db,
                    cache,
                    logger
                })
            })

            // Multiple mock services using mock
            const $mockDb = $db.mock({
                factory: () => "mock-db",
                required: []
            })

            const $mockCache = $cache.mock({
                factory: () => "mock-cache",
                required: []
            })

            const $hired = $service.hire($mockDb, $mockCache)
            const test = $hired.buy({}).unpack()

            expect(test.db).toBe("mock-db")
            expect(test.cache).toBe("mock-cache")
            expect(test.logger).toBe("real-logger")
        })

        it("should handle hiring unused services", () => {
            const $db = tm("db").service({
                factory: () => "db"
            })

            const $main = tm("main").service({
                required: [$db],
                factory: ({ db }) => "main-" + db
            })

            const $unused = tm("unused").service({
                factory: () => "base-extra"
            })

            const $unusedMock = $unused.mock({
                required: [],
                factory: () => "extra-service"
            })

            const $hired = $main.hire($unusedMock)
            const test = $hired.buy({}).unpack()

            // The extra service is added to the services list, but not to the result
            expect(test).toEqual("main-db")
        })

        it("should handle empty hire calls gracefully", () => {
            const $main = tm("main").service({
                factory: () => "main"
            })

            // Hire with no services - should work fine
            const $hired = $main.hire()
            const test = $hired.buy({}).unpack()

            expect(test).toBe("main")
        })

        it("should error on duplicate service names in hire", () => {
            const $db = tm("db").service({
                factory: () => "db"
            })

            const $main = tm("main").service({
                required: [$db],
                factory: ({ db }) => "main-" + db
            })

            const $mockDb1 = $db.mock({
                factory: () => "mock-db-1",
                required: []
            })

            const $mockDb2 = $db.mock({
                factory: () => "mock-db-2",
                required: []
            })

            const $hired = $main.hire($mockDb1, $mockDb2)

            expectTypeOf($hired).toExtend<DuplicateDependencyError>()
        })

        it("should allow hire multiple services together", () => {
            const $shared = tm("shared").spec<string>()
            const $unique = tm("unique").spec<number>()

            const $A = tm("A").service({
                required: [$shared],
                factory: ({ shared }) => {
                    return "A-" + shared
                }
            })

            const $B = tm("B").service({
                required: [$shared, $unique],
                factory: ({ shared, unique }) => {
                    return "B-" + shared + "-" + unique
                }
            })

            const supply = $A
                .hire($B)
                .buy(index($shared.of("shared-data"), $unique.of(123)))

            expect(supply.unpack()).toEqual("A-shared-data")
            const BResult = supply.deps[$B.name]
            expect(BResult).toEqual("B-shared-data-123")
        })

        it("should type check that all required specs are provided", () => {
            const $db = tm("db").spec<string>()
            const $cache = tm("cache").spec<string>()

            const $user = tm("user").service({
                required: [$db],
                factory: ({ db }) => {
                    return "user-" + db
                }
            })

            const $session = tm("session").service({
                required: [$cache],
                factory: ({ cache }) => {
                    return "session-" + cache
                }
            })

            const $combined = $user.hire($session)

            const db = $db.of("postgresql://localhost:5432/db")
            const cache = $cache.of("redis://localhost:6379")

            // @ts-expect-error - cache is missing
            const errorSupply = $combined.buy(index(db))

            const combinedSupply = $combined.buy(index(db, cache))

            expect(combinedSupply.unpack()).toEqual(
                "user-postgresql://localhost:5432/db"
            )

            const sessionResult = combinedSupply.deps[$session.name]
            expect(sessionResult).toEqual("session-redis://localhost:6379")
        })

        it("should handle errors in hire() method gracefully", () => {
            const $working = tm("working").service({
                factory: () => "working-value"
            })

            const $failing = tm("failing").service({
                factory: () => {
                    throw new Error("Service failed")
                    return
                }
            })

            const supply = $working.hire($failing).buy({})
            expect(supply.unpack()).toBe("working-value")
            expect(() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                supply.deps[$failing.name]
            }).toThrow("Service failed")
        })
    })

    describe("Accessing supplies after ctx.hire() call", () => {
        it(".supplies should contain the hired services' supplies properly typed", () => {
            const $service = tm("service").service({
                factory: () => "service-value"
            })

            const $contextual = tm("contextual").service({
                factory: () => "contextual-value"
            })

            const $main = tm("main").service({
                required: [$service],
                factory: (deps, ctx) => {
                    const supply = ctx($service).hire($contextual).buy({})

                    const contextualSupply = supply.market[$contextual.name]
                    expectTypeOf(contextualSupply).not.toEqualTypeOf<any>()
                    expectTypeOf(contextualSupply).toExtend<Supply<any>>()
                    expect(contextualSupply.unpack()).toBe("contextual-value")
                }
            })

            $main.buy({})
        })
    })
})

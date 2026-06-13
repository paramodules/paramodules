import { describe, it, expect, vi, expectTypeOf } from "vitest"
import { index, service } from "#index"
import { sleep, once } from "#utils"
import type {
    CircularModuleError,
    DuplicateServiceError,
    HiredGuard,
    ModulePlanGuard
} from "#types/guards"
import type { Supplier } from "#types/public"

describe("Mocks Feature", () => {
    describe("Mock Method", () => {
        it("should handle mock with less services", () => {
            const $param = service("param").param<boolean>()

            const $base = service("base").module({
                required: [$param],
                factory: ({ param }) => ({ base: param })
            })

            const $mocked = $base.mock({
                required: [],
                factory: () => ({ base: true, enhanced: true })
            })

            const result = $mocked.request({}).get()

            expect(result.base).toBe(true)
            expect(result.enhanced).toBe(true)
        })

        it("should not allow mocks in required array", () => {
            const $base = service("mock").module({
                factory: () => "base"
            })

            const $mock = $base.mock({
                required: [],
                factory: () => "mock"
            })

            expect(() => {
                const $next = service("next").module({
                    factory: () => "next",
                    //@ts-expect-error - mock in services array
                    required: [$mock]
                })
            }).toThrow()
        })

        it("should handle warmup setting in mock", async () => {
            const lazyProductSpy = vi.fn().mockReturnValue("lazy")
            const warmProductSpy = vi.fn().mockReturnValue("warm")

            const $lazy = service("lazy").module({
                factory: () => once(lazyProductSpy)
            })

            const $warmMock = $lazy.mock({
                factory: () => once(warmProductSpy),
                warmup: (warmProduct) => warmProduct()
            })

            const $test = service("test").module({
                required: [$lazy],
                factory: ({ lazy }) => lazy
            })

            $test.hire($warmMock).request({})
            $test.request({})

            await sleep(10)

            expect(lazyProductSpy).toHaveBeenCalledTimes(0)
            expect(warmProductSpy).toHaveBeenCalledTimes(1)
        })

        it("should compute precise REQUEST types with mock", () => {
            const $config = service("config").param<string>()
            const $apiKey = service("apiKey").param<string>()

            const $logger = service("logger").module({
                factory: () => "logger"
            })

            // Base service - return compatible type that can be extended
            const $base = service("base").module({
                factory: () => "base"
            })

            // mock with mixed request and app services
            const $mocked = $base.mock({
                required: [$config, $apiKey, $logger],
                factory: () => "proto"
            })

            $mocked.request(
                //@ts-expect-error - missing $apiKey
                index($config.of("test"))
            )

            $mocked.request(
                //@ts-expect-error - missing $config
                index($apiKey.of("secret-key"))
            )

            // The type system should now know exactly what needs to be supplied:
            // - config and apiKey (request supplies must be provided)
            // - logger should NOT need to be provided (it's a module service)
            const supplier = $mocked.request(
                index($config.of("test"), $apiKey.of("secret-key"))
            )

            const output = supplier.get()
            expect(output).toBe("proto")
        })

        it("should detect circular dependencies in mocks", () => {
            const $A = service("A").module({
                factory: () => "serviceA"
            })

            const $B = service("B").module({
                required: [$A],
                factory: ({ A }) => "serviceB uses " + A
            })

            // Try to create circular dependency using mock
            // This should be caught by the circular dependency detection
            expect(() => {
                const $mockA = $A.mock({
                    // @ts-expect-error - CircularModuleError
                    required: [$B], // This creates a potential circle
                    factory: ({ B }: { B: any }) => "mockA uses " + B
                })
            }).toThrow("Circular dependency detected")
        })
    })

    describe("Hire Method", () => {
        it("should allow hiring alternative modules for testing", () => {
            const $db = service("db").module({
                factory: () => "real-db"
            })

            const $cache = service("cache").module({
                factory: () => "real-cache"
            })

            const $logger = service("logger").module({
                factory: () => "real-logger"
            })

            const $module = service("module").module({
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

            const $hired = $module.hire($mockDb, $mockCache)
            const test = $hired.request({}).get()

            expect(test.db).toBe("mock-db")
            expect(test.cache).toBe("mock-cache")
            expect(test.logger).toBe("real-logger")
        })

        it("should handle hiring unused modules", () => {
            const $db = service("db").module({
                factory: () => "db"
            })

            const $main = service("main").module({
                required: [$db],
                factory: ({ db }) => "main-" + db
            })

            const $unused = service("unused").module({
                factory: () => "base-extra"
            })

            const $unusedMock = $unused.mock({
                required: [],
                factory: () => "extra-service"
            })

            const $hired = $main.hire($unusedMock)
            const test = $hired.request({}).get()

            // The extra service is added to the services list, but not to the result
            expect(test).toEqual("main-db")
        })

        it("should handle empty hire calls gracefully", () => {
            const $main = service("main").module({
                factory: () => "main"
            })

            // Hire with no services - should work fine
            const $hired = $main.hire()
            const test = $hired.request({}).get()

            expect(test).toBe("main")
        })

        it("should error on duplicate service names in hire", () => {
            const $db = service("db").module({
                factory: () => "db"
            })

            const $main = service("main").module({
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

            // @ts-expect-error - DuplicateServiceError
            const $hired = $main.hire($mockDb1, $mockDb2)
        })

        it("should allow hire multiple modules together", () => {
            const $shared = service("shared").param<string>()
            const $unique = service("unique").param<number>()

            const $A = service("A").module({
                required: [$shared],
                factory: ({ shared }) => {
                    return "A-" + shared
                }
            })

            const $B = service("B").module({
                required: [$shared, $unique],
                factory: ({ shared, unique }) => {
                    return "B-" + shared + "-" + unique
                }
            })

            const supplier = $A
                .hire($B)
                .request(index($shared.of("shared-data"), $unique.of(123)))

            expect(supplier.get()).toEqual("A-shared-data")
            const BResult = supplier.supplies[$B.tm]
            expect(BResult).toEqual("B-shared-data-123")
        })

        it("should type check that all required params are provided", () => {
            const $db = service("db").param<string>()
            const $cache = service("cache").param<string>()

            const $user = service("user").module({
                required: [$db],
                factory: ({ db }) => {
                    return "user-" + db
                }
            })

            const $session = service("session").module({
                required: [$cache],
                factory: ({ cache }) => {
                    return "session-" + cache
                }
            })

            const $combined = $user.hire($session)

            const db = $db.of("postgresql://localhost:5432/db")
            const cache = $cache.of("redis://localhost:6379")

            // @ts-expect-error - cache is missing
            const errorSupply = $combined.request(index(db))

            const combinedSupply = $combined.request(index(db, cache))

            expect(combinedSupply.get()).toEqual(
                "user-postgresql://localhost:5432/db"
            )

            const sessionResult = combinedSupply.supplies[$session.tm]
            expect(sessionResult).toEqual("session-redis://localhost:6379")
        })

        it("should handle errors in hire() method gracefully", () => {
            const $working = service("working").module({
                factory: () => "working-value"
            })

            const $failing = service("failing").module({
                factory: () => {
                    throw new Error("Service failed")
                    return
                }
            })

            const supplier = $working.hire($failing).request({})
            expect(supplier.get()).toBe("working-value")
            expect(() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                supplier.supplies[$failing.tm]
            }).toThrow("Service failed")
        })
    })

    describe("Accessing supplies after ctx.hire() call", () => {
        it(".supplies should contain the hired modules' supplies properly typed", () => {
            const $service = service("service").module({
                factory: () => "service-value"
            })

            const $contextual = service("contextual").module({
                factory: () => "contextual-value"
            })

            const $main = service("main").module({
                required: [$service],
                factory: (deps, ctx) => {
                    const supplier = ctx($service).hire($contextual).request({})

                    const contextualSupply = supplier.market[$contextual.tm]
                    expectTypeOf(contextualSupply).not.toEqualTypeOf<any>()
                    expectTypeOf(contextualSupply).toExtend<Supplier<any>>()
                    expect(contextualSupply.get()).toBe("contextual-value")
                }
            })

            $main.request({})
        })
    })
})

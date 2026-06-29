import { describe, it, expect, vi, beforeEach } from "vitest"
import { service } from "#index"
import { index, once, sleep } from "#utils"

describe("services", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Params", () => {
        it("should add a param and request it", () => {
            const $param = service("param").param<string>()

            const supplier = $param.of("test-value")

            expect(supplier.get()).toBe("test-value")
            expect(supplier.service.tm).toBe("param")
            expect($param.tm).toBe("param")
            expect($param._param).toBe(true)
        })

        it("should allow creating services with the same name independently", () => {
            const $a = service("duplicate").param<string>()
            const $b = service("duplicate").param<string>()

            expect($a.tm).toBe("duplicate")
            expect($b.tm).toBe("duplicate")
        })

        it("should handle different types correctly", () => {
            const $string = service("string").param<string>()
            const $number = service("number").param<number>()
            const $object = service("object").param<{
                name: string
            }>()

            expect($string.of("hello").get()).toBe("hello")
            expect($number.of(42).get()).toBe(42)
            expect($object.of({ name: "test" }).get()).toEqual({
                name: "test"
            })
        })
    })

    describe("Modules", () => {
        it("should add a module with no dependencies", () => {
            const $module = service("module").module({
                factory: () => "module"
            })

            expect($module.request({}).get()).toBe("module")
            expect($module.tm).toBe("module")
            expect($module._module).toBe(true)
        })

        it("should add a module with dependencies", () => {
            const $A = service("A").module({
                factory: () => "A"
            })

            const $B = service("B").module({
                factory: () => "B"
            })

            const $test = service("test").module({
                required: [$A, $B],
                factory: ({ A, B }) => {
                    return {
                        A,
                        B
                    }
                }
            })

            expect($test.request({}).get()).toEqual({
                A: "A",
                B: "B"
            })
        })
    })

    describe("Supply Chain", () => {
        it("Request a module without params", () => {
            const $A = service("A").module({
                factory: () => "A"
            })

            const $B = service("B").module({
                factory: () => "B"
            })

            const $main = service("main").module({
                required: [$A, $B],
                factory: ({ A, B }) => {
                    return {
                        A,
                        B
                    }
                }
            })

            expect($main.request({}).get()).toEqual({
                A: "A",
                B: "B"
            })
        })

        it("should respect modules in request params and not override them with buildtime module", () => {
            const $resource = service("resource").module({
                factory: () => "resource"
            })

            const $main = service("main").module({
                required: [$resource],
                factory: ({ resource }) => {
                    return {
                        resource
                    }
                }
            })

            expect(
                $main.request(index($resource.of("req-resource"))).get()
            ).toEqual({
                resource: "req-resource"
            })
        })

        it("should enable context switching by calling ctx() in a factory", () => {
            const $config = service("config").param<string>()
            const $name = service("name").param<string>()
            const $count = service("count").param<number>()

            const $test = service("test").module({
                required: [$config, $name, $count],
                factory: ({ config, name, count }) => {
                    return {
                        config,
                        name,
                        count
                    }
                }
            })

            const $main = service("main").module({
                required: [$test],
                factory: (supplies, ctx) => {
                    const newTestA = ctx($test)
                        .request(
                            index(
                                $config.of("new-config"),
                                $name.of("new-name"),
                                $count.of(42)
                            )
                        )
                        .get()

                    const newTestB = ctx($test)
                        .request(index($config.of("new-config")))
                        .get()

                    const newTestC = ctx($test)
                        .request(index($name.of("new-name")))
                        .get()

                    const newTestD = ctx($test)
                        .request(index($config.of("new-config"), $count.of(42)))
                        .get()

                    expect(newTestA).toEqual({
                        config: "new-config",
                        name: "new-name",
                        count: 42
                    })

                    expect(newTestB).toEqual({
                        config: "new-config",
                        name: "initial-name",
                        count: 1
                    })

                    expect(newTestC).toEqual({
                        config: "initial-config",
                        name: "new-name",
                        count: 1
                    })

                    expect(newTestD).toEqual({
                        config: "new-config",
                        name: "initial-name",
                        count: 42
                    })
                }
            })

            $main
                .request(
                    index(
                        $config.of("initial-config"),
                        $name.of("initial-name"),
                        $count.of(1)
                    )
                )
                .get()
        })
    })

    describe("Factory memoization", () => {
        it("should create separate memoization contexts for different requests", () => {
            const factorySpy = vi.fn().mockReturnValue("resource")
            const $resource = service("resource").module({
                factory: factorySpy
            })

            expect($resource.request({}).get()).toBe("resource")
            expect(factorySpy).toHaveBeenCalledTimes(1)

            // The memoization works within the same call context
            // Each call() creates a new context, so the factory is called again
            expect($resource.request({}).get()).toBe("resource")
            // Factory is called again for the new assembly context
            expect(factorySpy).toHaveBeenCalledTimes(2)
        })

        it("should memoize factory calls when accessed multiple times within the same request context", () => {
            const factorySpy = vi.fn().mockReturnValue("memoized")
            const $spy = service("spy").module({
                factory: factorySpy
            })

            const $test = service("test").module({
                required: [$spy],
                factory: (deps) => {
                    const spyAccess = deps.spy
                    const spyAccess2 = deps.spy

                    return "test"
                }
            })

            $test.request({}).get()
            // Factory should only be called once due to memoization within the same assembly context
            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("should keep memoization even if multiple dependents are nested", () => {
            const factory1Spy = vi.fn().mockReturnValue("A")
            const $A = service("A").module({
                factory: factory1Spy
            })

            const $B = service("B").module({
                required: [$A],
                factory: ({ A }) => {
                    return "B"
                }
            })

            const $test = service("test").module({
                required: [$A, $B],
                factory: ({ A, B }) => {
                    return {
                        A,
                        B
                    }
                }
            })

            expect($test.request({}).get()).toEqual({
                A: "A",
                B: "B"
            })

            // factory1  should only be called once due to memoization within the same context
            expect(factory1Spy).toHaveBeenCalledTimes(1)
        })

        it("should be recalled if dependent modules have changed through ctx switching", async () => {
            // A will be recalled
            const $A = service("A").module({
                factory: () => Date.now()
            })

            // B will be recalled when A is recalled
            const $B = service("B").module({
                required: [$A],
                factory: () => Date.now()
            })

            // C - doesn't depend on anything, so it will not be recalled
            const $C = service("C").module({
                factory: () => Date.now()
            })

            // D will be recalled when B is recalled
            const $D = service("D").module({
                required: [$B],
                factory: () => Date.now()
            })

            const $E = service("E").module({
                required: [$A, $B, $C, $D],
                factory: ({ A, B, C, D }) => {
                    return {
                        A,
                        B,
                        C,
                        D
                    }
                }
            })

            const $main = service("main").module({
                required: [$E],
                factory: async ({ E }, ctx) => {
                    await sleep(100)

                    // Override A - this should trigger recall of B and D
                    // but C should remain cached
                    const newE = ctx($E)
                        .request(index($A.of(Date.now())))
                        .get()

                    expect(newE.A).not.toBe(E.A)
                    expect(newE.B).not.toBe(E.B)
                    expect(newE.C).toBe(E.C)
                    expect(newE.D).not.toBe(E.D)
                }
            })

            await $main.request({}).get()
        })
    })

    describe("Automatic lifecycle management", () => {
        it("should preserve referential identity for modules without param dependencies when provisioning main", () => {
            const $session = service("session").param<{ userId: string }>()

            const $db = service("db").module({
                factory: () => ({ connection: Symbol("db") })
            })

            const $currentUser = service("currentUser").module({
                required: [$db, $session],
                factory: ({ db, session }) => ({
                    db,
                    userId: session.userId
                })
            })

            const $main = service("main")
                .module({
                    required: [$db, $currentUser],
                    factory: ({ db, currentUser }) => ({
                        db,
                        currentUser
                    })
                })
                .provision()

            const first = $main
                .request(index($session.of({ userId: "user-a" })))
                .get()

            const second = $main
                .request(index($session.of({ userId: "user-b" })))
                .get()

            expect(first.db).toBe(second.db)
            expect(first.currentUser).not.toBe(second.currentUser)
            expect(first.currentUser.userId).toBe("user-a")
            expect(second.currentUser.userId).toBe("user-b")
            expect(first).not.toBe(second)
        })
    })
    describe("Eager warmup behavior", () => {
        it("should warmup modules", async () => {
            const eagerFactorySpy = vi.fn().mockReturnValue("eager")
            const lazyProductSpy = vi.fn().mockReturnValue("lazy")
            const warmProductSpy = vi.fn().mockReturnValue("warm")

            const $eager = service("eager").module({
                factory: eagerFactorySpy
            })

            const $lazy = service("lazy").module({
                factory: () => once(lazyProductSpy)
            })

            const $warm = service("warm").module({
                factory: () => once(warmProductSpy),
                warmup: (lazyProduct) => lazyProduct()
            })

            const $main = service("main").module({
                required: [$eager, $lazy, $warm],
                factory: () => {
                    // Don't access any dependencies yet
                    return "main"
                }
            })

            const main = $main.request({}).get()

            await sleep(10)

            expect(eagerFactorySpy).toHaveBeenCalledTimes(1)
            expect(warmProductSpy).toHaveBeenCalledTimes(1)
            expect(lazyProductSpy).toHaveBeenCalledTimes(0)
            expect(main).toBe("main")
        })

        it("should handle warmup errors gracefully without breaking the supply chain", async () => {
            const errorFactorySpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })
            const errorWarmProductSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const $error = service("error").module({
                factory: errorFactorySpy
            })

            const $errorWarm = service("errorWarm").module({
                factory: () => once(errorWarmProductSpy),
                warmup: (errorWarmProduct) => errorWarmProduct()
            })

            const $main = service("main").module({
                required: [$error, $errorWarm],
                factory: () => {
                    // This should not throw error, as error products are not accessed by the factory
                    // Counter-intuitively, errorWarm throws when accessed from deps, even if not called, because warmup memoizes the error
                    // On access, unpack is called, which calls the warmup function. The warmup function does not run, because it is memoized,
                    // But the memoized error it returned from cache, so it gets thrown.
                    return "main"
                }
            })

            const main = $main.request({}).get()

            await sleep(10)

            expect(main).toBe("main")
            expect(errorFactorySpy).toHaveBeenCalledTimes(1)
            expect(errorWarmProductSpy).toHaveBeenCalledTimes(1)
        })

        it("should still throw error when getting a failed warmed up module", async () => {
            const errorWarmProductSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const $error = service("error").module({
                factory: () => once(errorWarmProductSpy),
                warmup: (errorWarmProduct) => errorWarmProduct()
            })

            const $main = service("main").module({
                required: [$error],
                factory: ({ error }) => {
                    return "main"
                }
            })

            await sleep(10)

            // Accessing the product should still throw the error
            expect(() => $main.request({}).get()).toThrow()
        })

        it("should work with complex dependency chains and selective warming up", async () => {
            const ASpy = vi.fn().mockReturnValue("A")
            const BSpy = vi.fn().mockReturnValue("B")

            const $A = service("A").module({
                factory: () => once(ASpy),
                warmup: (product) => product()
            })

            const $B = service("B").module({
                factory: () => once(BSpy)
            })

            const $main = service("main").module({
                required: [$A, $B],
                factory: () => {
                    return "main"
                }
            })

            const main = $main.request({}).get()

            await sleep(10)

            expect(ASpy).toHaveBeenCalledTimes(1)
            expect(BSpy).toHaveBeenCalledTimes(0)
            expect(main).toBe("main")
        })
    })

    describe("Type Safety and Edge Cases", () => {
        it("should handle empty modules correctly", () => {
            const $empty = service("empty").module({
                factory: () => "empty"
            })

            const emptySupplier = $empty.request({})
            expect(emptySupplier.get()).toBe("empty")
        })
    })
})

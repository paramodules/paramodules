import { describe, it, expect, vi, beforeEach } from "vitest"
import { tm } from "#index"
import { index, once, sleep } from "#utils"

describe("trademarks", () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe("Specs", () => {
        it("should add a spec and specify it", () => {
            const $spec = tm("spec").spec<string>()

            const supply = $spec.of("test-value")

            expect(supply.unpack()).toBe("test-value")
            expect(supply.tm.name).toBe("spec")
            expect($spec.name).toBe("spec")
            expect($spec._spec).toBe(true)
        })

        it("should allow creating trademarks with the same name independently", () => {
            const $a = tm("duplicate").spec<string>()
            const $b = tm("duplicate").spec<string>()

            expect($a.name).toBe("duplicate")
            expect($b.name).toBe("duplicate")
        })

        it("should handle different types correctly", () => {
            const $string = tm("string").spec<string>()
            const $number = tm("number").spec<number>()
            const $object = tm("object").spec<{
                name: string
            }>()

            expect($string.of("hello").unpack()).toBe("hello")
            expect($number.of(42).unpack()).toBe(42)
            expect($object.of({ name: "test" }).unpack()).toEqual({
                name: "test"
            })
        })
    })

    describe("Services", () => {
        it("should add a service with no dependencies", () => {
            const $service = tm("service").service({
                factory: () => "service"
            })

            expect($service.buy({}).unpack()).toBe("service")
            expect($service.name).toBe("service")
            expect($service._service).toBe(true)
        })

        it("should add a service with dependencies", () => {
            const $A = tm("A").service({
                factory: () => "A"
            })

            const $B = tm("B").service({
                factory: () => "B"
            })

            const $test = tm("test").service({
                required: [$A, $B],
                factory: ({ A, B }) => {
                    return {
                        A,
                        B
                    }
                }
            })

            expect($test.buy({}).unpack()).toEqual({
                A: "A",
                B: "B"
            })
        })
    })

    describe("Supply Chain", () => {
        it("Buy a service without specifications", () => {
            const $A = tm("A").service({
                factory: () => "A"
            })

            const $B = tm("B").service({
                factory: () => "B"
            })

            const $main = tm("main").service({
                required: [$A, $B],
                factory: ({ A, B }) => {
                    return {
                        A,
                        B
                    }
                }
            })

            expect($main.buy({}).unpack()).toEqual({
                A: "A",
                B: "B"
            })
        })

        it("should respect service specifications and not override them during assembly", () => {
            const $resource = tm("resource").service({
                factory: () => "resource"
            })

            const $main = tm("main").service({
                required: [$resource],
                factory: ({ resource }) => {
                    return {
                        resource
                    }
                }
            })

            expect(
                $main.buy(index($resource.of("initial-resource"))).unpack()
            ).toEqual({
                resource: "initial-resource"
            })
        })

        it("should enable context switching by calling ctx() in a factory", () => {
            const $config = tm("config").spec<string>()
            const $name = tm("name").spec<string>()
            const $count = tm("count").spec<number>()

            const $test = tm("test").service({
                required: [$config, $name, $count],
                factory: ({ config, name, count }) => {
                    return {
                        config,
                        name,
                        count
                    }
                }
            })

            const $main = tm("main").service({
                required: [$test],
                factory: (deps, ctx) => {
                    const newTestA = ctx($test)
                        .buy(
                            index(
                                $config.of("new-config"),
                                $name.of("new-name"),
                                $count.of(42)
                            )
                        )
                        .unpack()

                    const newTestB = ctx($test)
                        .buy(index($config.of("new-config")))
                        .unpack()

                    const newTestC = ctx($test)
                        .buy(index($name.of("new-name")))
                        .unpack()

                    const newTestD = ctx($test)
                        .buy(index($config.of("new-config"), $count.of(42)))
                        .unpack()

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
                .buy(
                    index(
                        $config.of("initial-config"),
                        $name.of("initial-name"),
                        $count.of(1)
                    )
                )
                .unpack()
        })
    })

    describe("Factory memoization", () => {
        it("should create separate memoization contexts for different buy contexts", () => {
            const factorySpy = vi.fn().mockReturnValue("resource")
            const $resource = tm("resource").service({
                factory: factorySpy
            })

            expect($resource.buy({}).unpack()).toBe("resource")
            expect(factorySpy).toHaveBeenCalledTimes(1)

            // The memoization works within the same assembly context
            // Each call to assemble() creates a new context, so the factory is called again
            expect($resource.buy({}).unpack()).toBe("resource")
            // Factory is called again for the new assembly context
            expect(factorySpy).toHaveBeenCalledTimes(2)
        })

        it("should memoize factory calls when accessed multiple times within the same buy context", () => {
            const factorySpy = vi.fn().mockReturnValue("memoized")
            const $spy = tm("spy").service({
                factory: factorySpy
            })

            const $test = tm("test").service({
                required: [$spy],
                factory: (deps) => {
                    const spyAccess = deps.spy
                    const spyAccess2 = deps.spy

                    return "test"
                }
            })

            $test.buy({}).unpack()
            // Factory should only be called once due to memoization within the same assembly context
            expect(factorySpy).toHaveBeenCalledTimes(1)
        })

        it("should keep memoization even if multiple dependents are nested", () => {
            const factory1Spy = vi.fn().mockReturnValue("A")
            const $A = tm("A").service({
                factory: factory1Spy
            })

            const $B = tm("B").service({
                required: [$A],
                factory: ({ A }) => {
                    return "B"
                }
            })

            const $test = tm("test").service({
                required: [$A, $B],
                factory: ({ A, B }) => {
                    return {
                        A,
                        B
                    }
                }
            })

            expect($test.buy({}).unpack()).toEqual({
                A: "A",
                B: "B"
            })

            // factory1  should only be called once due to memoization within the same context
            expect(factory1Spy).toHaveBeenCalledTimes(1)
        })

        it("should rerun if dependent services have changed through ctx switching", async () => {
            // A will be reassembled
            const $A = tm("A").service({
                factory: () => Date.now()
            })

            // B will be reassembled when A reassembles
            const $B = tm("B").service({
                required: [$A],
                factory: () => Date.now()
            })

            // C - doesn't depend on anything, so it will not be reassembled
            const $C = tm("C").service({
                factory: () => Date.now()
            })

            // D will be reassembled when B reassembles
            const $D = tm("D").service({
                required: [$B],
                factory: () => Date.now()
            })

            const $E = tm("E").service({
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

            const $main = tm("main").service({
                required: [$E],
                factory: async ({ E }, ctx) => {
                    await sleep(100)

                    // Override A - this should trigger resupply of B and D
                    // but C should remain cached
                    const newE = ctx($E)
                        .buy(index($A.of(Date.now())))
                        .unpack()

                    expect(newE.A).not.toBe(E.A)
                    expect(newE.B).not.toBe(E.B)
                    expect(newE.C).toBe(E.C)
                    expect(newE.D).not.toBe(E.D)
                }
            })

            await $main.buy({}).unpack()
        })
    })

    describe("Automatic lifecycle management", () => {
        it("should preserve referential identity for services without spec dependencies when provisioning main", () => {
            const $session = tm("session").spec<{ userId: string }>()

            const $db = tm("db").service({
                factory: () => ({ connection: Symbol("db") })
            })

            const $currentUser = tm("currentUser").service({
                required: [$db, $session],
                factory: ({ db, session }) => ({
                    db,
                    userId: session.userId
                })
            })

            const $main = tm("main")
                .service({
                    required: [$db, $currentUser],
                    factory: ({ db, currentUser }) => ({
                        db,
                        currentUser
                    })
                })
                .provision()

            const first = $main
                .buy(index($session.of({ userId: "user-a" })))
                .unpack()

            const second = $main
                .buy(index($session.of({ userId: "user-b" })))
                .unpack()

            expect(first.db).toBe(second.db)
            expect(first.currentUser).not.toBe(second.currentUser)
            expect(first.currentUser.userId).toBe("user-a")
            expect(second.currentUser.userId).toBe("user-b")
            expect(first).not.toBe(second)
        })
    })
    describe("Eager warmup behavior", () => {
        it("should warmup app services", async () => {
            const eagerFactorySpy = vi.fn().mockReturnValue("eager")
            const lazyProductSpy = vi.fn().mockReturnValue("lazy")
            const warmProductSpy = vi.fn().mockReturnValue("warm")

            const $eager = tm("eager").service({
                factory: eagerFactorySpy
            })

            const $lazy = tm("lazy").service({
                factory: () => once(lazyProductSpy)
            })

            const $warm = tm("warm").service({
                factory: () => once(warmProductSpy),
                warmup: (lazyProduct) => lazyProduct()
            })

            const $main = tm("main").service({
                required: [$eager, $lazy, $warm],
                factory: () => {
                    // Don't access any dependencies yet
                    return "main"
                }
            })

            const main = $main.buy({}).unpack()

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

            const $error = tm("error").service({
                factory: errorFactorySpy
            })

            const $errorWarm = tm("errorWarm").service({
                factory: () => once(errorWarmProductSpy),
                warmup: (errorWarmProduct) => errorWarmProduct()
            })

            const $main = tm("main").service({
                required: [$error, $errorWarm],
                factory: () => {
                    // This should not throw error, as error products are not accessed by the factory
                    // Counter-intuitively, errorWarm throws when accessed from deps, even if not called, because warmup memoizes the error
                    // On access, unpack is called, which calls the warmup function. The warmup function does not run, because it is memoized,
                    // But the memoized error it returned from cache, so it gets thrown.
                    return "main"
                }
            })

            const main = $main.buy({}).unpack()

            await sleep(10)

            expect(main).toBe("main")
            expect(errorFactorySpy).toHaveBeenCalledTimes(1)
            expect(errorWarmProductSpy).toHaveBeenCalledTimes(1)
        })

        it("should still throw error when unpacking a failed warmed up service", async () => {
            const errorWarmProductSpy = vi.fn().mockImplementation(() => {
                throw new Error()
            })

            const $error = tm("error").service({
                factory: () => once(errorWarmProductSpy),
                warmup: (errorWarmProduct) => errorWarmProduct()
            })

            const $main = tm("main").service({
                required: [$error],
                factory: ({ error }) => {
                    return "main"
                }
            })

            await sleep(10)

            // Accessing the product should still throw the error
            expect(() => $main.buy({}).unpack()).toThrow()
        })

        it("should work with complex dependency chains and selective initing", async () => {
            const ASpy = vi.fn().mockReturnValue("A")
            const BSpy = vi.fn().mockReturnValue("B")

            const $A = tm("A").service({
                factory: () => once(ASpy),
                warmup: (product) => product()
            })

            const $B = tm("B").service({
                factory: () => once(BSpy)
            })

            const $main = tm("main").service({
                required: [$A, $B],
                factory: () => {
                    return "main"
                }
            })

            const main = $main.buy({}).unpack()

            await sleep(10)

            expect(ASpy).toHaveBeenCalledTimes(1)
            expect(BSpy).toHaveBeenCalledTimes(0)
            expect(main).toBe("main")
        })
    })

    describe("Type Safety and Edge Cases", () => {
        it("should handle empty services correctly", () => {
            const $empty = tm("empty").service({
                factory: () => "empty"
            })

            const emptySupply = $empty.buy({})
            expect(emptySupply.unpack()).toBe("empty")
        })
    })
})

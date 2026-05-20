import { describe, it, expect, vi, expectTypeOf } from "vitest"
import { tm } from "#index"
import { index, sleep } from "#utils"
import type { DuplicateDependencyError } from "#types/guards"
import type { Supply } from "#types/public"

describe("Context Propagation", () => {
    it("ctx should return a service with same name", () => {
        const factoryMock = vi.fn().mockReturnValue("value")

        const $contextual = tm("contextual").service({
            factory: factoryMock
        })

        const $main = tm("main").service({
            factory: (deps, ctx) => {
                // Contextual services are passed but not auto-assembled
                expect(ctx($contextual).name).toBe($contextual.name)
                expect(factoryMock).not.toHaveBeenCalled()

                return "main-result"
            }
        })

        const result = $main.buy({}).unpack()
        expect(result).toBe("main-result")
        expect(factoryMock).not.toHaveBeenCalled()
    })

    it("should require specs for hired contextual services", () => {
        const $input = tm("input").spec<string>()

        const $contextual1 = tm("contextual1").service({
            required: [$input],
            factory: ({ input }) => `A1: ${input}`
        })

        const $contextual2 = tm("contextual2").service({
            required: [$input],
            factory: ({ input }) => `A2: ${input}`
        })

        const $base = tm("base").service({
            factory: (deps, ctx) => {
                return ctx($contextual1)
                    .buy(index($input.of("test")))
                    .unpack()
            }
        })

        const $extended = $base.hire($contextual2)

        // @ts-expect-error - hired request supplies must be supplied also
        $extended.buy({})
        const result = $extended.buy(index($input.of("unused"))).unpack()
        expect(result).toBe("A1: test")
    })

    it("should allow manual contextual buying within factory", () => {
        const factoryMock = vi.fn().mockReturnValue("value")

        const $contextual = tm("contextual").service({
            factory: factoryMock
        })

        const $main = tm("main").service({
            factory: (deps, ctx) => {
                const contextualSupply = ctx($contextual).buy({})
                const value = contextualSupply.unpack()

                expect(factoryMock).toHaveBeenCalledTimes(1)
                expect(value).toBe("value")

                return {
                    main: "main-result",
                    contextual: value
                }
            }
        })

        const result = $main.buy({}).unpack()
        expect(result).toEqual({
            main: "main-result",
            contextual: "value"
        })
    })

    it("should support conditional buying based on context (session admin example)", () => {
        const $session = tm("session").spec<{
            userId: string
            role: string
        }>()

        const $adminSession = tm("adminSession").spec<{
            userId: string
            role: "admin"
        }>()

        const $adminFeature = tm("adminFeature").service({
            //Even if unused, protects this function from being called by non-admins via Typescript
            required: [$adminSession],
            factory: () => "sensitive-admin-data"
        })

        const $userFeature = tm("userFeature").service({
            factory: () => "regular-user-data"
        })

        const $main = tm("main").service({
            required: [$session, $userFeature],
            factory: ({ session, userFeature }, ctx) => {
                const role = session.role

                if (role === "admin") {
                    const adminFeature = ctx($adminFeature).buy(
                        index($adminSession.of({ ...session, role }))
                    )

                    return {
                        user: session.userId,
                        feature: adminFeature.unpack()
                    }
                } else {
                    return {
                        user: session.userId,
                        feature: userFeature
                    }
                }
            }
        })

        const adminSession = $session.of({
            userId: "admin123",
            role: "admin"
        })
        const adminResult = $main.buy(index(adminSession)).unpack()

        expect(adminResult).toEqual({
            user: "admin123",
            feature: "sensitive-admin-data"
        })

        const userSession = $session.of({
            userId: "user456",
            role: "user"
        })
        const userResult = $main.buy(index(userSession)).unpack()

        expect(userResult).toEqual({
            user: "user456",
            feature: "regular-user-data"
        })
    })

    it("should handle contextual service errors gracefully", () => {
        const $failing = tm("failing").service({
            factory: () => {
                throw new Error("Context service failed")
                return
            }
        })

        const $main = tm("main").service({
            factory: (deps, ctx) => {
                ctx($failing).buy({}).unpack()
                return "main"
            }
        })

        expect(() => {
            $main.buy({}).unpack()
        }).toThrow("Context service failed")
    })

    it("should support complex contextual dependency chains", () => {
        const $db = tm("db").spec<string>()

        const $repository = tm("repo").service({
            required: [$db],
            factory: ({ db }) => {
                return "repo-" + db
            }
        })

        const $feature = tm("feature").service({
            required: [$repository],
            factory: ({ repo }) => {
                return "feature-" + repo
            }
        })

        const $main = tm("main").service({
            factory: (deps, ctx) => {
                const feature = ctx($feature)
                    .buy(index($db.of("postgresql://localhost:5432/mydb")))
                    .unpack()

                return "main-" + feature
            }
        })

        const result = $main.buy({}).unpack()
        expect(result).toEqual(
            "main-feature-repo-postgresql://localhost:5432/mydb"
        )
    })

    it("should properly overwrite spec in contextual buy() calls", () => {
        const $number = tm("number").spec<number>()
        const $doubler = tm("doubler").service({
            required: [$number],
            factory: ({ number }) => {
                return number * 2
            }
        })

        const $quadrupler = tm("quadrupler").service({
            required: [$doubler],
            factory: ({ doubler }) => {
                return doubler * 2
            }
        })

        const $main = tm("main").service({
            required: [$doubler],
            factory: (deps, ctx) => {
                const assembled = ctx($quadrupler)
                    .buy(index($number.of(5)))
                    .unpack()
                return assembled
            }
        })

        const result = $main.buy(index($number.of(10))).unpack()
        expect(result).toEqual(20)
    })

    it("should preserve supplies from previous buy calls that don't depend on the new specified", async () => {
        const $number = tm("number").spec<number>()
        const $dummy = tm("dummy").service({
            factory: () => "dummy"
        })

        let timesCalled = 0
        const $counter = tm("counter").service({
            required: [$dummy],
            factory: ({ dummy }) => {
                return timesCalled++
            }
        })

        const $reassembled = tm("reassembled").service({
            required: [$number, $counter],
            factory: ({ number }) => {
                return number
            }
        })

        const $main = tm("main").service({
            required: [$dummy, $counter],
            factory: (deps, ctx) => {
                const reassembled = ctx($reassembled)
                    .buy(index($number.of(10)))
                    .unpack()
                const counter = ctx($counter).buy({}).unpack()
                return counter
            }
        })

        $main.buy(index($number.of(20))).unpack()
        expect(timesCalled).toEqual(1)
    })

    it("Providing undefined supply to buy() should erase the previous supply", () => {
        const $number = tm("number").spec<number>()
        const $username = tm("username").service({
            required: [$number],
            factory: ({ number }) => {
                return "John-" + number
            }
        })

        const $greeter = tm("greeter").service({
            required: [$username],
            factory: ({ username }) => {
                return "Hello, " + username + "!"
            }
        })

        const $main = tm("main").service({
            required: [$number, $username],
            factory: (deps, ctx) => {
                const assembled = ctx($greeter)
                    .buy({ [$username.name]: undefined })
                    .unpack()
                return assembled
            }
        })

        const result = $main
            .buy(index($number.of(10), $username.of("Ted-10")))
            .unpack()
        expect(result).toEqual("Hello, John-10!")
    })

    it("should support mocks with contextual service buying", () => {
        const factoryMock = vi.fn().mockReturnValue("product")

        const $contextual = tm("contextual").service({
            factory: factoryMock
        })

        const $base = tm("base").service({
            factory: () => "base-value"
        })

        const $mock = $base.mock({
            factory: (deps, ctx) => {
                expect(ctx($contextual).name).toBe($contextual.name)

                const assembled = ctx($contextual).buy({})
                const product = assembled.unpack()

                return `mock-${product}`
            }
        })

        const result = $mock.buy({}).unpack()
        expect(result).toBe("mock-product")
        expect(factoryMock).toHaveBeenCalledTimes(1)
    })

    it("should support mocks with multiple contextual services", () => {
        const ASpy = vi.fn().mockReturnValue("A")
        const BSpy = vi.fn().mockReturnValue("B")

        const $A = tm("A").service({
            factory: ASpy
        })

        const $B = tm("B").service({
            factory: BSpy
        })

        const $base = tm("base").service({
            factory: () => "base-value"
        })

        const $mock = $base.mock({
            factory: (deps, ctx) => {
                const contextualA = ctx($A).buy({}).unpack()
                const contextualB = ctx($B).buy({}).unpack()

                return `base-value-${contextualA}-${contextualB}`
            }
        })

        const result = $mock.buy({}).unpack()
        expect(result).toBe("base-value-A-B")
        expect(ASpy).toHaveBeenCalledTimes(1)
        expect(BSpy).toHaveBeenCalledTimes(1)
    })

    it("should support hire() method with contextual replacement", async () => {
        const originalSpy = vi.fn().mockReturnValue("original")
        const mockSpy = vi.fn().mockReturnValue("mocked")

        const $original = tm("original").service({
            factory: originalSpy
        })

        const $mock = $original.mock({
            factory: mockSpy
        })
        const $base = tm("base").service({
            factory: (deps, ctx) => {
                return ctx($original).buy({}).unpack()
            }
        })

        const result = $base.hire($mock).buy({}).unpack()

        await sleep(10)

        expect(result).toBe("mocked")
        expect(originalSpy).toHaveBeenCalledTimes(0)
        expect(mockSpy).toHaveBeenCalledTimes(2)
    })

    it("should support empty contextual dependency setup in mocks", () => {
        const $base = tm("base").service({
            factory: () => "base-value"
        })

        const $mock = $base.mock({
            factory: () => {
                return "mock-value"
            }
        })

        const result = $mock.buy({}).unpack()
        expect(result).toBe("mock-value")
    })

    it("should handle contextual service errors in mocks gracefully", () => {
        const errorSpy = vi.fn().mockImplementation(() => {
            throw new Error("Context service error")
        })

        const $error = tm("error").service({
            factory: errorSpy
        })

        const $base = tm("base").service({
            factory: () => "base-value"
        })

        const $mock = $base.mock({
            factory: (deps, ctx) => {
                expect(() => {
                    ctx($error).buy({}).unpack()
                }).toThrow("Context service error")
                return "mock-value"
            }
        })

        const result = $mock.buy({}).unpack()
        expect(result).toBe("mock-value")
    })

    it("should handle contextual service errors in hire() method gracefully", () => {
        const baseSpy = vi.fn().mockReturnValue("base")
        const errorSpy = vi.fn().mockImplementation(() => {
            throw new Error("Context service error")
        })

        const $base = tm("base").service({
            factory: baseSpy
        })

        const $error = $base.mock({
            factory: errorSpy
        })

        const $main = tm("main").service({
            factory: (deps, ctx) => {
                expect(() => {
                    ctx($base).buy({}).unpack()
                }).toThrow()
                return "main"
            }
        })

        const $hired = $main.hire($error)

        const result = $hired.buy({}).unpack()
        expect(result).toBe("main")
    })

    it("should support complex contextual dependency chains in mocks", () => {
        const dbSpy = vi.fn().mockReturnValue("db")
        const testSpy = vi.fn().mockReturnValue("test")

        const $config = tm("config").spec<{ env: string }>()
        const $db = tm("db").service({
            required: [$config],
            factory: dbSpy
        })
        const $test = tm("test").service({
            required: [$db],
            factory: testSpy
        })

        const $base = tm("base").service({
            factory: () => "base"
        })

        const $mock = $base.mock({
            factory: (deps, ctx) => {
                const test = ctx($test)
                    .buy(index($config.of({ env: "test" })))
                    .unpack()

                return `base-${test}`
            }
        })

        const result = $mock.buy({}).unpack()
        expect(result).toBe("base-test")
    })

    it("should error on duplicate contextual service names in hire()", async () => {
        const originalSpy = vi.fn().mockReturnValue("original")
        const overrideSpy = vi.fn().mockReturnValue("override")
        const overrideSpy2 = vi.fn().mockReturnValue("override2")

        const $original = tm("duplicate").service({
            factory: originalSpy
        })

        const $override = $original.mock({
            factory: overrideSpy
        })

        const $override2 = $original.mock({
            factory: overrideSpy2
        })

        const $base = tm("base").service({
            factory: (deps, ctx) => {
                return ctx($original).buy({}).unpack()
            }
        })

        const $hired = $base.hire($override, $override2)

        expectTypeOf($hired).toExtend<DuplicateDependencyError>()
    })

    describe("Accessing supplies after hire() call in a factory", () => {
        it("supplies of supply built with hire() should contain only the hired services' supplies properly typed", () => {
            const $contextual1 = tm("contextual1").service({
                factory: () => "contextual1-value"
            })

            const $contextual2 = tm("contextual2").service({
                factory: () => "contextual2-value"
            })

            const $main = tm("main").service({
                factory: (deps, ctx) => {
                    const supply = ctx($contextual1).hire($contextual2).buy({})

                    expectTypeOf(
                        supply.market.contextual2
                    ).not.toEqualTypeOf<any>()
                    expectTypeOf(supply.market.contextual2).toExtend<
                        Supply<any>
                    >()
                    expect(supply.market.contextual2.unpack()).toBe(
                        "contextual2-value"
                    )

                    expectTypeOf(
                        supply.deps.contextual2
                    ).not.toEqualTypeOf<any>()
                    expectTypeOf(supply.deps.contextual2).toExtend<string>()
                }
            })

            $main.buy({}).unpack()
        })
    })

    describe("Type-safety of nested ctx().buy() calls", () => {
        it("should properly type the result of nested ctx().buy() calls", () => {
            const $inputA = tm("inputA").spec<string>()
            const $inputB = tm("inputB").spec<string>()

            const $A = tm("A").service({
                required: [$inputA],
                factory: () => {
                    return "A-value"
                }
            })

            const $B = tm("B").service({
                required: [$inputA, $inputB],
                factory: ({ inputA, inputB }) => {
                    expect(inputA).toBe("inputA-value")
                    expect(inputB).toBe("inputB-value")
                    return "B-value"
                }
            })

            const $main = tm("main").service({
                required: [$A],
                factory: (deps, ctx) => {
                    // @ts-expect-error - input supply inputB is not supplied
                    ctx($B).buy({})
                    // Works, input supply inputA doesn't need to be supplied, reused from deps
                    ctx($B)
                        .buy(index($inputB.of("inputB-value")))
                        .unpack()
                    return "main-value"
                }
            })

            $main.buy(index($inputA.of("inputA-value"))).unpack()
        })

        it("Calling ctx($service).buy() should never require any supplies to be supplied", () => {
            const $input = tm("input").spec<string>()
            const $product = tm("product").service({
                required: [$input],
                factory: ({ input }) => {
                    return input
                }
            })

            const $main = tm("main").service({
                required: [$product],
                factory: (deps, ctx) => {
                    expect(ctx($product).buy({}).unpack()).toBe("input-value")
                }
            })

            $main.buy(index($input.of("input-value"))).unpack()
        })

        it("Calling ctx().hire(mock).buy() should be properly typed", () => {
            const $input = tm("input").spec<string>()
            const $A = tm("A").service({
                factory: () => "A-value"
            })

            const $B = tm("B").service({
                required: [$A],
                factory: ({ A }) => A
            })

            const $AMock = $A.mock({
                required: [$input],
                factory: () => "AMock-value"
            })

            const $main = tm("main").service({
                factory: (deps, ctx) => {
                    const hired = ctx($B).hire($AMock)

                    expect(() => {
                        // @ts-expect-error - input supply is not supplied
                        hired.buy({}).unpack()
                    }).toThrow()
                    expect(
                        hired.buy(index($input.of("input-value"))).unpack()
                    ).toBe("AMock-value")
                }
            })

            $main.buy({}).unpack()
        })
    })
})

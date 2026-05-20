import { describe, it, expect, assertType } from "vitest"
import { index, tm } from "#index"

describe("Optionals Feature", () => {
    describe("Basic Optional Usage", () => {
        it("should allow defining optional specs in service plan", () => {
            const $optional = tm("optional").spec<string>()

            const $service = tm("service").service({
                optionals: [$optional],
                factory: ({ optional }) => {
                    assertType<string | undefined>(optional)
                    return optional
                }
            })

            expect($service._optionals).toEqual([$optional])
            expect($service.buy({}).unpack()).toEqual(undefined)
            expect($service.buy(index($optional.of("test"))).unpack()).toEqual(
                "test"
            )
            expect(
                // @ts-expect-error - invalid type
                $service.buy(index($optional.of(55))).unpack()
            ).toEqual(55)
        })

        it("should work when optional is NOT provided", () => {
            const $config = tm("config").spec<string>()
            const $optional = tm("optional").spec<number>()

            const $service = tm("service").service({
                required: [$config],
                optionals: [$optional],
                factory: ({ config, optional }) => {
                    return {
                        config,
                        hasOptional: optional !== undefined,
                        optionalValue: optional
                    }
                }
            })

            const result = $service.buy(index($config.of("test"))).unpack()

            expect(result).toEqual({
                config: "test",
                hasOptional: false,
                optionalValue: undefined
            })
        })

        it("should support multiple optionals", () => {
            const $required = tm("required").spec<string>()
            const $opt1 = tm("opt1").spec<number>()
            const $opt2 = tm("opt2").spec<boolean>()
            const $opt3 = tm("opt3").spec<string>()

            const $service = tm("service").service({
                required: [$required],
                optionals: [$opt1, $opt2, $opt3],
                factory: ({ required, opt1, opt2, opt3 }) => {
                    return {
                        required,
                        opt1,
                        opt2,
                        opt3
                    }
                }
            })

            // Provide only some optionals
            const result = $service
                .buy(index($required.of("test"), $opt2.of(true)))
                .unpack()

            expect(result).toEqual({
                required: "test",
                opt1: undefined,
                opt2: true,
                opt3: undefined
            })
        })
    })

    describe("Type Safety with Optionals", () => {
        it("should make optional supplies nullable in deps type", () => {
            const $required = tm("required").spec<string>()
            const $optional = tm("optional").spec<number>()

            const $service = tm("service").service({
                required: [$required],
                optionals: [$optional],
                factory: ({ required, optional }) => {
                    // Required service should be non-nullable in deps type
                    assertType<string>(required)
                    assertType<number | undefined>(optional)
                    return "result"
                }
            })

            // Should not require optional in ToSupply
            $service.buy(index($required.of("test"))).unpack()

            // But should allow it
            $service.buy(index($required.of("test"), $optional.of(42)))
        })

        it("should require all required services in ToSupply", () => {
            const $required = tm("required").spec<string>()
            const $optional = tm("optional").spec<number>()

            const $service = tm("service").service({
                required: [$required],
                optionals: [$optional],
                factory: ({ required, optional }) => {
                    assertType<string>(required)
                    assertType<number | undefined>(optional)
                    return "result"
                }
            })

            expect(() => {
                // @ts-expect-error - missing required service
                $service.buy(index($optional.of(42))).unpack()
            }).toThrow()

            // Should work without optional
            $service.buy(index($required.of("test"))).unpack()
        })
    })

    describe("Spec in ctx wrapper", () => {
        it("should just return spec (noop)", () => {
            const $input = tm("input").spec<string>()
            const $contextual = tm("contextual").service({
                factory: () => "assembled"
            })

            const $service = tm("service").service({
                optionals: [$input],
                factory: (deps, ctx) => {
                    // Both should be in ctx
                    expect(ctx($input)).toBe($input)
                    expect(ctx($contextual).name).toBe($contextual.name)
                }
            })

            $service.buy({}).unpack()
        })
    })

    describe("Optionals with Nested Dependencies", () => {
        it("should handle optionals in nested app service chains", () => {
            const $optionalConfig = tm("optionalConfig").spec<{
                apiKey: string
            }>()
            const $baseConfig = tm("baseConfig").spec<{
                url: string
            }>()

            const $api = tm("api").service({
                required: [$baseConfig],
                optionals: [$optionalConfig],
                factory: ({ baseConfig, optionalConfig }) => {
                    return {
                        url: baseConfig.url,
                        apiKey: optionalConfig?.apiKey ?? "default-key"
                    }
                }
            })

            const $app = tm("app").service({
                required: [$api],
                factory: ({ api }) => {
                    return `Connecting to ${api.url} with ${api.apiKey}`
                }
            })

            // Without optional
            const result1 = $app
                .buy(index($baseConfig.of({ url: "https://api.example.com" })))
                .unpack()
            expect(result1).toBe(
                "Connecting to https://api.example.com with default-key"
            )

            // With optional
            const result2 = $app
                .buy(
                    index(
                        $baseConfig.of({ url: "https://api.example.com" }),
                        $optionalConfig.of({ apiKey: "secret-123" })
                    )
                )
                .unpack()
            expect(result2).toBe(
                "Connecting to https://api.example.com with secret-123"
            )
        })

        it("should propagate optionals through transitive dependencies in types", () => {
            const $optional = tm("optional").spec<string>()

            const $child = tm("child").service({
                optionals: [$optional],
                factory: ({ optional }) => {
                    return optional ?? "default"
                }
            })

            const $parent = tm("parent").service({
                required: [$child],
                factory: ({ child }) => {
                    return child
                }
            })

            // Should not require optional
            const result1 = $parent.buy({}).unpack()
            expect(result1).toBe("default")

            // Should accept optional
            const result2 = $parent.buy(index($optional.of("custom"))).unpack()
            expect(result2).toBe("custom")

            // Should accept optional but type-check it if provided
            // @ts-expect-error - invalid optional type
            const result4 = $parent.buy(index($optional.of(55))).unpack()
            expect(result4).toBe(55)
        })
    })

    describe("Optionals with Mocks", () => {
        it("should allow mocks to have different optionals", () => {
            const $required = tm("required").spec<string>()
            const $optional1 = tm("optional1").spec<number>()
            const $optional2 = tm("optional2").spec<number>()

            const $base = tm("base").service({
                required: [$required],
                optionals: [$optional1],
                factory: ({ required, optional1 }) => {
                    return {
                        required,
                        value: optional1 ?? 0
                    }
                }
            })

            const $mocked = $base.mock({
                required: [$required],
                optionals: [$optional2],
                factory: ({ required, optional2 }) => {
                    return {
                        required,
                        value: (optional2 ?? 0) * 2
                    }
                }
            })

            const result = $mocked
                .buy(index($required.of("test"), $optional2.of(21)))
                .unpack()

            expect(result).toEqual({
                required: "test",
                value: 42
            })
        })

        it("should handle optionals with hire method", () => {
            const $config = tm("config").spec<string>()
            const $optional = tm("optional").spec<number>()

            const $dependency = tm("dependency").service({
                required: [$config],
                optionals: [$optional],
                factory: ({ optional }) => {
                    const opt = optional
                    return opt ? opt * 2 : 0
                }
            })

            const $main = tm("main").service({
                required: [$dependency],
                factory: ({ dependency }) => dependency
            })

            const $mockDep = $dependency.mock({
                factory: () => 100
            })

            const $hired = $main.hire($mockDep)

            const result = $hired.buy({}).unpack()
            expect(result).toBe(100)
        })
    })

    describe("Optionals with Ctx", () => {
        it("should allow overriding optional when it was initially provided", () => {
            const $config = tm("config").spec<string>()
            const $optional1 = tm("optional1").spec<number>()
            const $optional2 = tm("optional2").spec<number>()

            const $service = tm("service").service({
                required: [$config],
                optionals: [$optional1, $optional2],
                factory: ({ config, optional1, optional2 }) => {
                    return {
                        config: config,
                        ...(optional1 ? { optional1 } : {}),
                        ...(optional2 ? { optional2 } : {})
                    }
                }
            })

            const $main = tm("main").service({
                required: [$service],
                factory: ({ service }, ctx) => {
                    const initial = service
                    expect(initial).toEqual({
                        config: "initial"
                    })

                    const modified = ctx($service)
                        .buy(index($optional2.of(50)))
                        .unpack()
                    expect(modified).toEqual({
                        config: "initial",
                        optional2: 50
                    })
                }
            })

            $main.buy(index($config.of("initial"))).unpack()
        })

        it("should allow removing optional in ctx", () => {
            const $config = tm("config").spec<string>()
            const $optional = tm("optional").spec<number>()

            const $service = tm("service").service({
                required: [$config],
                optionals: [$optional],
                factory: ({ config, optional }) => ({
                    config,
                    optional: optional ?? 0
                })
            })

            const $main = tm("main").service({
                required: [$service],
                factory: ({ service }, ctx) => {
                    const initial = service
                    expect(initial).toEqual({
                        config: "test",
                        optional: 42
                    })

                    const reassembled = ctx($service)
                        .buy({ [$optional.name]: undefined })
                        .unpack()
                    expect(reassembled).toEqual({
                        config: "test",
                        optional: 0
                    })
                }
            })

            $main.buy(index($config.of("test"), $optional.of(42))).unpack()
        })
    })

    describe("Optionals with .hire() Method", () => {
        it("should handle optionals when using .hire() for batch assembly", () => {
            const $optional1 = tm("optional1").spec<string>()
            const $optional2 = tm("optional2").spec<string>()

            const $service1 = tm("service1").service({
                optionals: [$optional1],
                factory: ({ optional1 }) => {
                    return `S1: ${optional1 ?? "none"}`
                }
            })

            const $service2 = tm("service2").service({
                optionals: [$optional2],
                factory: ({ optional2 }) => {
                    return `S2: ${optional2 ?? "none"}`
                }
            })

            const batchSupply = $service1
                .hire($service2)
                .buy(index($optional1.of("test")))

            expect(batchSupply.unpack()).toBe("S1: test")
            expect(batchSupply.deps[$service2.name]).toBe("S2: none")
        })
    })

    describe("Edge Cases and Error Handling", () => {
        it("should handle empty optionals array", () => {
            const $config = tm("config").spec<string>()

            const $service = tm("service").service({
                required: [$config],
                optionals: [],
                factory: ({ config }) => config
            })

            const result = $service.buy(index($config.of("test"))).unpack()
            expect(result).toBe("test")
        })

        it("should handle service with only optionals (no required services)", () => {
            const $optional1 = tm("optional1").spec<string>()
            const $optional2 = tm("optional2").spec<number>()

            const $service = tm("service").service({
                optionals: [$optional1, $optional2],
                factory: ({ optional1, optional2 }) => {
                    return {
                        opt1: optional1,
                        opt2: optional2
                    }
                }
            })

            // Should work with no supplies at all
            const result1 = $service.buy({}).unpack()
            expect(result1).toEqual({
                opt1: undefined,
                opt2: undefined
            })

            // Should work with some optionals
            const result2 = $service.buy(index($optional1.of("hello"))).unpack()
            expect(result2).toEqual({
                opt1: "hello",
                opt2: undefined
            })

            // Should work with all optionals
            const result3 = $service
                .buy(index($optional1.of("hello"), $optional2.of(42)))
                .unpack()
            expect(result3).toEqual({
                opt1: "hello",
                opt2: 42
            })
        })

        it("should handle warmup function with optionals", () => {
            const $optional = tm("optional").spec<number>()
            let optStore: number | undefined = undefined

            const $service = tm("service").service({
                optionals: [$optional],
                factory: ({ optional }) => {
                    return optional ?? 10
                },
                warmup: (service, { optional }) => {
                    optStore = optional
                }
            })

            const result1 = $service.buy({}).unpack()
            expect(result1).toBe(10)
            expect(optStore).toEqual(undefined)

            const result2 = $service.buy(index($optional.of(5))).unpack()
            expect(result2).toBe(5)
            expect(optStore).toEqual(5)
        })
    })

    describe("Real-World Use Cases", () => {
        it("Feature flag example", () => {
            const $featureFlag = tm("featureFlag").spec<boolean>()

            const $session = tm("session").spec<string>()

            const $optionalFeature = tm("optionalFeature").service({
                required: [$session],
                factory: ({ session }) => {
                    return session
                }
            })

            const $main = tm("main").service({
                optionals: [$featureFlag],
                factory: ({ featureFlag }, ctx) => {
                    const enabled = featureFlag

                    if (enabled) {
                        // Assemble the optional feature with the optional context
                        const feature = ctx($optionalFeature)
                            .buy(index($session.of("userA")))
                            .unpack()
                        return feature
                    }

                    return undefined
                }
            })

            // Without optional context
            const $result1 = $main.buy(index($featureFlag.of(true)))
            expect($result1.unpack()).toEqual("userA")

            // With optional context
            const $result2 = $main.buy(index())
            expect($result2.unpack()).toEqual(undefined)
        })

        it("should support optional authentication/authorization context", () => {
            const $publicData = tm("publicData").spec<{
                title: string
            }>()

            const $userAuth = tm("userAuth").spec<{
                userId: string
                token: string
            }>()

            const $api = tm("api").service({
                required: [$publicData],
                optionals: [$userAuth],
                factory: ({ publicData, userAuth }) => {
                    const data = publicData
                    const auth = userAuth

                    return {
                        getPublic: () => data.title,
                        getPrivate: () => {
                            if (!auth) {
                                throw new Error("Not authenticated")
                            }
                            return `${data.title} - User: ${auth.userId}`
                        }
                    }
                }
            })

            // Public access
            const $publicApi = $api.buy(
                index($publicData.of({ title: "Hello World" }))
            )
            expect($publicApi.unpack().getPublic()).toBe("Hello World")
            expect(() => $publicApi.unpack().getPrivate()).toThrow(
                "Not authenticated"
            )

            // Authenticated access
            const $authApi = $api.buy(
                index(
                    $publicData.of({ title: "Hello World" }),
                    $userAuth.of({ userId: "user123", token: "abc" })
                )
            )
            expect($authApi.unpack().getPublic()).toBe("Hello World")
            expect($authApi.unpack().getPrivate()).toBe(
                "Hello World - User: user123"
            )
        })

        it("should support optional caching/performance optimization context", () => {
            const $config = tm("config").spec<{
                apiUrl: string
            }>()

            const $cache = tm("cache").spec<Map<string, unknown>>()

            const $dataService = tm("dataService").service({
                required: [$config],
                optionals: [$cache],
                factory: ({ config, cache }) => {
                    return {
                        fetch: (key: string) => {
                            if (cache?.has(key)) {
                                return { data: cache.get(key), cached: true }
                            }
                            const data = `data-from-${config.apiUrl}-${key}`
                            cache?.set(key, data)
                            return { data, cached: false }
                        }
                    }
                }
            })

            // Without cache
            const $service1 = $dataService.buy(
                index($config.of({ apiUrl: "api.example.com" }))
            )
            expect($service1.unpack().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: false
            })

            // With cache
            const cache = new Map<string, unknown>()
            const $service2 = $dataService.buy(
                index(
                    $config.of({ apiUrl: "api.example.com" }),
                    $cache.of(cache)
                )
            )
            expect($service2.unpack().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: false
            })
            expect($service2.unpack().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: true
            })
        })
    })
})

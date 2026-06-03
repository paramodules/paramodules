import { describe, it, expect, assertType } from "vitest"
import { index, service } from "#index"

describe("Optionals Feature", () => {
    describe("Basic Optional Usage", () => {
        it("should allow defining optional specs in module plan", () => {
            const $optional = service("optional").spec<string>()

            const $module = service("module").module({
                optionals: [$optional],
                factory: ({ optional }) => {
                    assertType<string | undefined>(optional)
                    return optional
                }
            })

            expect($module._optionals).toEqual([$optional])
            expect($module.call({}).get()).toEqual(undefined)
            expect($module.call(index($optional.of("test"))).get()).toEqual(
                "test"
            )
            expect(
                // @ts-expect-error - invalid type
                $module.call(index($optional.of(55))).get()
            ).toEqual(55)
        })

        it("should work when optional is NOT provided", () => {
            const $config = service("config").spec<string>()
            const $optional = service("optional").spec<number>()

            const $module = service("module").module({
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

            const result = $module.call(index($config.of("test"))).get()

            expect(result).toEqual({
                config: "test",
                hasOptional: false,
                optionalValue: undefined
            })
        })

        it("should support multiple optionals", () => {
            const $required = service("required").spec<string>()
            const $opt1 = service("opt1").spec<number>()
            const $opt2 = service("opt2").spec<boolean>()
            const $opt3 = service("opt3").spec<string>()

            const $module = service("module").module({
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
            const result = $module
                .call(index($required.of("test"), $opt2.of(true)))
                .get()

            expect(result).toEqual({
                required: "test",
                opt1: undefined,
                opt2: true,
                opt3: undefined
            })
        })
    })

    describe("Type Safety with Optionals", () => {
        it("should make optional supplies nullable in supplies type", () => {
            const $required = service("required").spec<string>()
            const $optional = service("optional").spec<number>()

            const $module = service("module").module({
                required: [$required],
                optionals: [$optional],
                factory: ({ required, optional }) => {
                    // Required service should be non-nullable in deps type
                    assertType<string>(required)
                    assertType<number | undefined>(optional)
                    return "result"
                }
            })

            // Should not require optional in ToSpecify
            $module.call(index($required.of("test"))).get()

            // But should allow it
            $module.call(index($required.of("test"), $optional.of(42)))
        })

        it("should require all required specs in ToSupply", () => {
            const $required = service("required").spec<string>()
            const $optional = service("optional").spec<number>()

            const $service = service("service").module({
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
                $service.call(index($optional.of(42))).get()
            }).toThrow()

            // Should work without optional
            $service.call(index($required.of("test"))).get()
        })
    })

    describe("Spec in ctx wrapper", () => {
        it("should just return spec (noop)", () => {
            const $input = service("input").spec<string>()
            const $contextual = service("contextual").module({
                factory: () => "assembled"
            })

            const $module = service("module").module({
                optionals: [$input],
                factory: (deps, ctx) => {
                    // Both should be in ctx
                    expect(ctx($input)).toBe($input)
                    expect(ctx($contextual).tm).toBe($contextual.tm)
                }
            })

            $module.call({}).get()
        })
    })

    describe("Optionals with Nested Dependencies", () => {
        it("should handle optionals in nested module chains", () => {
            const $optionalConfig = service("optionalConfig").spec<{
                apiKey: string
            }>()
            const $baseConfig = service("baseConfig").spec<{
                url: string
            }>()

            const $api = service("api").module({
                required: [$baseConfig],
                optionals: [$optionalConfig],
                factory: ({ baseConfig, optionalConfig }) => {
                    return {
                        url: baseConfig.url,
                        apiKey: optionalConfig?.apiKey ?? "default-key"
                    }
                }
            })

            const $app = service("app").module({
                required: [$api],
                factory: ({ api }) => {
                    return `Connecting to ${api.url} with ${api.apiKey}`
                }
            })

            // Without optional
            const result1 = $app
                .call(index($baseConfig.of({ url: "https://api.example.com" })))
                .get()
            expect(result1).toBe(
                "Connecting to https://api.example.com with default-key"
            )

            // With optional
            const result2 = $app
                .call(
                    index(
                        $baseConfig.of({ url: "https://api.example.com" }),
                        $optionalConfig.of({ apiKey: "secret-123" })
                    )
                )
                .get()
            expect(result2).toBe(
                "Connecting to https://api.example.com with secret-123"
            )
        })

        it("should propagate optionals through transitive dependencies in types", () => {
            const $optional = service("optional").spec<string>()

            const $child = service("child").module({
                optionals: [$optional],
                factory: ({ optional }) => {
                    return optional ?? "default"
                }
            })

            const $parent = service("parent").module({
                required: [$child],
                factory: ({ child }) => {
                    return child
                }
            })

            // Should not require optional
            const result1 = $parent.call({}).get()
            expect(result1).toBe("default")

            // Should accept optional
            const result2 = $parent.call(index($optional.of("custom"))).get()
            expect(result2).toBe("custom")

            // Should accept optional but type-check it if provided
            // @ts-expect-error - invalid optional type
            const result4 = $parent.call(index($optional.of(55))).get()
            expect(result4).toBe(55)
        })
    })

    describe("Optionals with Mocks", () => {
        it("should allow mocks to have different optionals", () => {
            const $required = service("required").spec<string>()
            const $optional1 = service("optional1").spec<number>()
            const $optional2 = service("optional2").spec<number>()

            const $base = service("base").module({
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
                .call(index($required.of("test"), $optional2.of(21)))
                .get()

            expect(result).toEqual({
                required: "test",
                value: 42
            })
        })

        it("should handle optionals with hire method", () => {
            const $config = service("config").spec<string>()
            const $optional = service("optional").spec<number>()

            const $dependency = service("dependency").module({
                required: [$config],
                optionals: [$optional],
                factory: ({ optional }) => {
                    const opt = optional
                    return opt ? opt * 2 : 0
                }
            })

            const $main = service("main").module({
                required: [$dependency],
                factory: ({ dependency }) => dependency
            })

            const $mockDep = $dependency.mock({
                factory: () => 100
            })

            const $hired = $main.hire($mockDep)

            const result = $hired.call({}).get()
            expect(result).toBe(100)
        })
    })

    describe("Optionals with Ctx", () => {
        it("should allow overriding optional when it was initially provided", () => {
            const $config = service("config").spec<string>()
            const $optional1 = service("optional1").spec<number>()
            const $optional2 = service("optional2").spec<number>()

            const $module = service("module").module({
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

            const $main = service("main").module({
                required: [$module],
                factory: ({ module }, ctx) => {
                    const initial = module
                    expect(initial).toEqual({
                        config: "initial"
                    })

                    const modified = ctx($module)
                        .call(index($optional2.of(50)))
                        .get()
                    expect(modified).toEqual({
                        config: "initial",
                        optional2: 50
                    })
                }
            })

            $main.call(index($config.of("initial"))).get()
        })

        it("should allow removing optional in ctx", () => {
            const $config = service("config").spec<string>()
            const $optional = service("optional").spec<number>()

            const $module = service("module").module({
                required: [$config],
                optionals: [$optional],
                factory: ({ config, optional }) => ({
                    config,
                    optional: optional ?? 0
                })
            })

            const $main = service("main").module({
                required: [$module],
                factory: ({ module }, ctx) => {
                    const initial = module
                    expect(initial).toEqual({
                        config: "test",
                        optional: 42
                    })

                    const reassembled = ctx($module)
                        .call({ [$optional.tm]: undefined })
                        .get()
                    expect(reassembled).toEqual({
                        config: "test",
                        optional: 0
                    })
                }
            })

            $main.call(index($config.of("test"), $optional.of(42))).get()
        })
    })

    describe("Optionals with .hire() Method", () => {
        it("should handle optionals when using .hire() for batch calling", () => {
            const $optional1 = service("optional1").spec<string>()
            const $optional2 = service("optional2").spec<string>()

            const $module1 = service("module1").module({
                optionals: [$optional1],
                factory: ({ optional1 }) => {
                    return `S1: ${optional1 ?? "none"}`
                }
            })

            const $module2 = service("module2").module({
                optionals: [$optional2],
                factory: ({ optional2 }) => {
                    return `S2: ${optional2 ?? "none"}`
                }
            })

            const batchSupply = $module1
                .hire($module2)
                .call(index($optional1.of("test")))

            expect(batchSupply.get()).toBe("S1: test")
            expect(batchSupply.supplies[$module2.tm]).toBe("S2: none")
        })
    })

    describe("Edge Cases and Error Handling", () => {
        it("should handle empty optionals array", () => {
            const $config = service("config").spec<string>()

            const $module = service("module").module({
                required: [$config],
                optionals: [],
                factory: ({ config }) => config
            })

            const result = $module.call(index($config.of("test"))).get()
            expect(result).toBe("test")
        })

        it("should handle module with only optionals (no required specs)", () => {
            const $optional1 = service("optional1").spec<string>()
            const $optional2 = service("optional2").spec<number>()

            const $module = service("module").module({
                optionals: [$optional1, $optional2],
                factory: ({ optional1, optional2 }) => {
                    return {
                        opt1: optional1,
                        opt2: optional2
                    }
                }
            })

            // Should work with no supplies at all
            const result1 = $module.call({}).get()
            expect(result1).toEqual({
                opt1: undefined,
                opt2: undefined
            })

            // Should work with some optionals
            const result2 = $module.call(index($optional1.of("hello"))).get()
            expect(result2).toEqual({
                opt1: "hello",
                opt2: undefined
            })

            // Should work with all optionals
            const result3 = $module
                .call(index($optional1.of("hello"), $optional2.of(42)))
                .get()
            expect(result3).toEqual({
                opt1: "hello",
                opt2: 42
            })
        })

        it("should handle warmup function with optionals", () => {
            const $optional = service("optional").spec<number>()
            let optStore: number | undefined = undefined

            const $module = service("module").module({
                optionals: [$optional],
                factory: ({ optional }) => {
                    return optional ?? 10
                },
                warmup: (module, { optional }) => {
                    optStore = optional
                }
            })

            const result1 = $module.call({}).get()
            expect(result1).toBe(10)
            expect(optStore).toEqual(undefined)

            const result2 = $module.call(index($optional.of(5))).get()
            expect(result2).toBe(5)
            expect(optStore).toEqual(5)
        })
    })

    describe("Real-World Use Cases", () => {
        it("Feature flag example", () => {
            const $featureFlag = service("featureFlag").spec<boolean>()

            const $session = service("session").spec<string>()

            const $optionalFeature = service("optionalFeature").module({
                required: [$session],
                factory: ({ session }) => {
                    return session
                }
            })

            const $main = service("main").module({
                optionals: [$featureFlag],
                factory: ({ featureFlag }, ctx) => {
                    const enabled = featureFlag

                    if (enabled) {
                        // Assemble the optional feature with the optional context
                        const feature = ctx($optionalFeature)
                            .call(index($session.of("userA")))
                            .get()
                        return feature
                    }

                    return undefined
                }
            })

            // Without optional context
            const $result1 = $main.call(index($featureFlag.of(true)))
            expect($result1.get()).toEqual("userA")

            // With optional context
            const $result2 = $main.call(index())
            expect($result2.get()).toEqual(undefined)
        })

        it("should support optional authentication/authorization context", () => {
            const $publicData = service("publicData").spec<{
                title: string
            }>()

            const $userAuth = service("userAuth").spec<{
                userId: string
                token: string
            }>()

            const $api = service("api").module({
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
            const $publicApi = $api.call(
                index($publicData.of({ title: "Hello World" }))
            )
            expect($publicApi.get().getPublic()).toBe("Hello World")
            expect(() => $publicApi.get().getPrivate()).toThrow(
                "Not authenticated"
            )

            // Authenticated access
            const $authApi = $api.call(
                index(
                    $publicData.of({ title: "Hello World" }),
                    $userAuth.of({ userId: "user123", token: "abc" })
                )
            )
            expect($authApi.get().getPublic()).toBe("Hello World")
            expect($authApi.get().getPrivate()).toBe(
                "Hello World - User: user123"
            )
        })

        it("should support optional caching/performance optimization context", () => {
            const $config = service("config").spec<{
                apiUrl: string
            }>()

            const $cache = service("cache").spec<Map<string, unknown>>()

            const $data = service("data").module({
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
            const dataSupplier = $data.call(
                index($config.of({ apiUrl: "api.example.com" }))
            )
            expect(dataSupplier.get().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: false
            })

            // With cache
            const cache = new Map<string, unknown>()
            const dataSupplier2 = $data.call(
                index(
                    $config.of({ apiUrl: "api.example.com" }),
                    $cache.of(cache)
                )
            )
            expect(dataSupplier2.get().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: false
            })
            expect(dataSupplier2.get().fetch("user")).toEqual({
                data: "data-from-api.example.com-user",
                cached: true
            })
        })
    })
})

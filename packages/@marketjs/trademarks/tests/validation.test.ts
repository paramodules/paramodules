import { describe, it, expect } from "vitest"
import { tm } from "#index"

describe("Runtime Validation", () => {
    describe("spec()", () => {
        it("should create specs and allow packing values", () => {
            const $value = tm("value").spec<string>()
            const packed = $value.of("test")

            expect($value.name).toBe("value")
            expect(packed.unpack()).toBe("test")
        })

        it("should enforce runtime service plan validation", () => {
            expect(() => tm("test").service({} as any)).toThrow(TypeError)
            expect(() => tm("test").service({} as any)).toThrow(
                "test must have a 'factory' property"
            )
        })
    })

    describe("service()", () => {
        it("should throw TypeError when plan is not an object", () => {
            expect(() => tm("A").service(null as any)).toThrow(TypeError)
            expect(() => tm("B").service(null as any)).toThrow(
                "B must be an object, got null"
            )
        })

        it("should throw TypeError when plan is an array", () => {
            expect(() => tm("A").service([] as any)).toThrow(TypeError)
            expect(() => tm("B").service([] as any)).toThrow(
                "B must be an object, not an array"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            expect(() => tm("A").service({} as any)).toThrow(TypeError)
            expect(() => tm("B").service({} as any)).toThrow(
                "B must have a 'factory' property"
            )
        })

        it("should throw TypeError when factory is not a function", () => {
            expect(() =>
                tm("A").service({ factory: "not a function" } as any)
            ).toThrow(TypeError)
            expect(() =>
                tm("B").service({ factory: "not a function" } as any)
            ).toThrow("B must be a function, got string")
        })

        it("should throw TypeError when required is not an array", () => {
            expect(() =>
                tm("A").service({
                    factory: () => ({}),
                    required: "not an array"
                } as any)
            ).toThrow(TypeError)
            expect(() =>
                tm("B").service({
                    factory: () => ({}),
                    required: "not an array"
                } as any)
            ).toThrow("B must be an array")
        })
    })

    describe("service.buy()", () => {
        it("should throw TypeError when specified is not an object", () => {
            const $resource = tm("resource").service({
                factory: () => ({})
            })
            expect(() => $resource.buy(null as any)).toThrow(TypeError)
            expect(() => $resource.buy(null as any)).toThrow(
                "specified must be an object, got null"
            )
        })

        it("should throw TypeError when specified is an array", () => {
            const $resource = tm("resource").service({
                factory: () => ({})
            })
            expect(() => $resource.buy([] as any)).toThrow(TypeError)
            expect(() => $resource.buy([] as any)).toThrow(
                "specified must be an object, not an array"
            )
        })
    })

    describe("service.hire()", () => {
        it("should throw TypeError when hired contain invalid items", () => {
            const $resource = tm("resource").service({
                factory: () => ({})
            })
            expect(() => $resource.hire(null as any)).toThrow(TypeError)
            expect(() => $resource.hire(null as any)).toThrow(TypeError)
        })

        it("should throw TypeError when service is missing name property", () => {
            const $resource = tm("resource").service({
                factory: () => ({})
            })
            expect(() => $resource.hire({} as any)).toThrow(TypeError)
        })
    })

    describe("service.mock()", () => {
        it("should throw TypeError when plan is not an object", () => {
            const $resource = tm("resource").service({
                factory: () => ({})
            })
            expect(() => $resource.mock(null as any)).toThrow(TypeError)
            expect(() => $resource.mock(null as any)).toThrow(
                "resource must be an object, got null"
            )
        })

        it("should throw TypeError when factory is missing", () => {
            const $resource = tm("resource").service({
                factory: () => ({})
            })
            expect(() => $resource.mock({} as any)).toThrow(TypeError)
            expect(() => $resource.mock({} as any)).toThrow(
                "resource must have a 'factory' property"
            )
        })
    })
})

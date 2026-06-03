import { service } from "#index"
import type { CircularModuleError } from "#types/guards"
import { describe, expect, expectTypeOf, it } from "vitest"

describe("Circular test", () => {
    it("throws for circular dependencies at runtime", () => {
        const $a1 = service("a1").module({
            factory: () => "a1"
        })

        expect(() => {
            const $a11 = service("a1").module({
                required: [$a1],
                factory: () => "a2"
            })
        }).toThrow()
    })

    it("types circular modules as CircularDependencyError", () => {
        const $a1 = service("a1").module({
            factory: () => "a1"
        })

        function circularAppSupplier() {
            return service("a1").module({
                required: [$a1],
                factory: () => "a2"
            })
        }

        expectTypeOf(
            circularAppSupplier
        ).returns.toExtend<CircularModuleError>()
    })
})

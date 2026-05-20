import { tm } from "#index"
import type { CircularDependencyError } from "#types/guards"
import { describe, expect, expectTypeOf, it } from "vitest"

describe("Circular test", () => {
    it("throws for circular dependencies at runtime", () => {
        const $a1 = tm("a1").service({
            factory: () => "a1"
        })

        expect(() => {
            const $a11 = tm("a1").service({
                required: [$a1],
                factory: () => "a2"
            })
        }).toThrow()
    })

    it("types circular app supplier as CircularDependencyError", () => {
        const $a1 = tm("a1").service({
            factory: () => "a1"
        })

        function circularAppSupplier() {
            return tm("a1").service({
                required: [$a1],
                factory: () => "a2"
            })
        }

        expectTypeOf(
            circularAppSupplier
        ).returns.toExtend<CircularDependencyError>()
    })
})

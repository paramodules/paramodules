import { service } from "#index"
import { describe, expect, it } from "vitest"

describe("Circular test", () => {
    it("throws for circular dependencies at runtime", () => {
        const $a1 = service("a1").module({
            factory: () => "a1"
        })

        expect(() => {
            service("a1").module({
                // @ts-expect-error - CircularModuleError
                required: [$a1],
                factory: () => "a2"
            })
        }).toThrow()
    })
})

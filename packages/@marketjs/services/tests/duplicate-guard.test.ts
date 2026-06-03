import { describe, it, expectTypeOf } from "vitest"
import { service } from "#index"
import type { DuplicateServiceError } from "#types/guards"

describe("Duplicate Guard", () => {
    it("returns DuplicateDependencyError type for duplicate services", () => {
        const $dep = service("dep").module({
            factory: () => "dep"
        })

        const $withDuplicate = service("withDuplicate").module({
            required: [$dep, $dep],
            factory: () => "main"
        })

        expectTypeOf($withDuplicate).toExtend<DuplicateServiceError>()
    })
})

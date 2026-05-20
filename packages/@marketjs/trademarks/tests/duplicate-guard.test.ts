import { describe, it, expectTypeOf } from "vitest"
import { tm } from "#index"
import type { DuplicateDependencyError } from "#types/guards"

describe("Duplicate Guard", () => {
    it("returns DuplicateDependencyError type for duplicate services", () => {
        const $dep = tm("dep").service({
            factory: () => "dep"
        })

        const $withDuplicate = tm("withDuplicate").service({
            required: [$dep, $dep],
            factory: () => "main"
        })

        expectTypeOf($withDuplicate).toExtend<DuplicateDependencyError>()
    })
})

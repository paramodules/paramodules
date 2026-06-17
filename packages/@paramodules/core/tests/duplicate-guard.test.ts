import { describe, it } from "vitest"
import { service } from "#index"

describe("Duplicate Guard", () => {
    it("returns DuplicateDependencyError type for duplicate services", () => {
        const $dep = service("dep").module({
            factory: () => "dep"
        })

        const $withDuplicate = service("withDuplicate").module({
            // @ts-expect-error - DuplicateServiceError
            required: [$dep, $dep],
            factory: () => "main"
        })
    })
})

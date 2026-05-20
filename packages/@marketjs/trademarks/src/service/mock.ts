import { main } from "#service/main"
import type { ServiceGuard } from "#types/guards"
import type { PartialServicePlan } from "#types/internal"
import { assertServicePlan } from "#validation"
import type {
    OriginalTM,
    Spec,
    UnknownService,
    Mock as MockType
} from "#types/public"

/**
 * Creates a mock version of this app service with different dependencies.
 * Mocks are used for creating test variations of a app service with different implementations
 * while keeping the same name. This is useful for testing, stubbing, or providing
 * alternative implementations without affecting the original service.
 *
 * @typeParam CONSTRAINT - The type constraint for the mock
 * @typeParam SERVICES - Dependencies for the mock (can be different from the original)
 * @typeParam OPTIONALS - Array of optional request services for the mock
 * @param plan - Plan for the mock
 * @param plan.factory - Factory function for the mock
 * @param plan.services - Dependencies for the mock (can be different from the original)
 * @param plan.optionals - Optional dependencies for the mock
 * @param plan.warmup - Optional function called after the mock factory returns
 * @returns A mock app service with mock flag set to true
 * @public
 */
export function Mock<NAME extends string, TYPE>() {
    return function mock<
        THIS extends UnknownService,
        TYPE2 extends THIS["_type"],
        REQUIRED2 extends OriginalTM[] = [],
        OPTIONALS2 extends Spec[] = []
    >(
        this: THIS & {
            name: NAME
            _type: TYPE
        },
        plan: PartialServicePlan<TYPE2, REQUIRED2, OPTIONALS2>
    ): ServiceGuard<
        MockType<THIS, TYPE2, REQUIRED2, OPTIONALS2>,
        [...REQUIRED2, ...OPTIONALS2]
    > {
        assertServicePlan(this.name, plan)
        const mock = main(this.name, plan)

        return {
            ...this,
            ...mock,
            hired: [] as [],
            _mock: true as const,
            _oldToSpecify: this._toSpecify,
            _oldDeps: this._deps
        } satisfies MockType<THIS, TYPE2, REQUIRED2, OPTIONALS2> as any
    }
}

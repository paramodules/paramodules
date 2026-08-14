import { main } from "#service/main"
import type { ModulePlanGuard } from "#types/guards"
import { assertModulePlan } from "#validation"
import type {
    Implement as ImplementType,
    Interface,
    OriginalService,
    Param,
    PartialModulePlan
} from "#types/public"
import { simpleId } from "#utils"
import { Hire } from "#service/hire"
import { Mock } from "#service/mock"

/**
 * Creates a module that fills an interface port. Hire the result at the
 * request entry-point so dependents that `required` the interface receive
 * this implementation.
 *
 * @public
 */
export function Implement() {
    return function implement<
        THIS extends Interface,
        TYPE2 extends THIS["_type"],
        REQUIRED2 extends OriginalService[] = [],
        OPTIONALS2 extends Param[] = []
    >(
        this: THIS,
        plan: ModulePlanGuard<THIS["tm"], TYPE2, REQUIRED2, OPTIONALS2>
    ): ImplementType<THIS, TYPE2, REQUIRED2, OPTIONALS2> {
        const modulePlan = plan as PartialModulePlan<
            TYPE2,
            REQUIRED2,
            OPTIONALS2
        >
        assertModulePlan(this.tm, modulePlan)
        const module = main(this.tm, modulePlan)

        return {
            ...module,
            mock: Mock(),
            hire: Hire(),
            _mock: false as const,
            _implement: true as const,
            _implementId: simpleId()
        } satisfies ImplementType<THIS, TYPE2, REQUIRED2, OPTIONALS2> as any
    }
}

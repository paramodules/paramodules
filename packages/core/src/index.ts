import { Hire } from "#service/hire"
import { main, param } from "#service/main"
import { Mock } from "#service/mock"
import { type PartialModulePlan } from "#types/public"
import type { ModulePlanGuard } from "#types/guards"
import type { Request } from "#types/records"
import { assertTM, assertModulePlan } from "#validation"
import type { OriginalService, Module, Param } from "#types/public"

export function service<TM extends string>(tm: TM) {
    return {
        param<TYPE = any>(): Param<TM, TYPE, never> {
            assertTM(tm)
            return param<TM, TYPE>(tm)
        },
        /**
         * Creates a module that can assemble complex objects from dependencies.
         * Modules can depend on other specs and services and have factory functions for creation.
         *
         * @typeParam TYPE - The type constraint for values this module produces
         * @typeParam REQUIRED - Array of services this module depends on
         * @typeParam OPTIONALS - Array of optional request services this module may depend on
         * @param plan - Plan for the module
         * @param plan.factory - Factory function that creates the value from its dependencies
         * @param plan.warmup - Optional function called after the factory returns (see README for eager / lazy / warmed patterns)
         * @param plan.context - Optional context for the module
         *
         * @returns A module with methods like call, provision, mock, and hire
         * @public
         */
        module<
            TYPE,
            REQUIRED extends OriginalService[] = [],
            OPTIONALS extends Param[] = []
        >(
            plan: ModulePlanGuard<TM, TYPE, REQUIRED, OPTIONALS>
        ): Module<
            TM,
            TYPE,
            OPTIONALS[number]["tm"],
            undefined,
            Request<{
                required: REQUIRED
                optionals: OPTIONALS
            }>,
            [],
            false
        > {
            assertTM(tm)
            assertModulePlan(
                tm,
                plan as PartialModulePlan<TYPE, REQUIRED, OPTIONALS>
            )

            return {
                ...main(
                    tm,
                    plan as PartialModulePlan<TYPE, REQUIRED, OPTIONALS>
                ),
                mock: Mock(),
                hire: Hire(),
                _mock: false as const
            }
        }
    }
}

export { index, sleep, once } from "#utils"
export * from "#types/public"

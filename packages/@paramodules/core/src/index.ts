import { Hire } from "#service/hire"
import { main } from "#service/main"
import { Mock } from "#service/mock"
import { type PartialModulePlan } from "#types/internal"
import type { Request } from "#types/records"
import type { ModuleGuard } from "#types/guards"
import { assertTM, assertModulePlan } from "#validation"
import type {
    OriginalService,
    Module,
    Param,
    UnknownService,
    Supplier
} from "#types/public"

export function service<TM extends string>(tm: TM) {
    return {
        param<TYPE = any>(): Param<TM, TYPE> {
            assertTM(tm)
            return {
                tm,
                of<THIS extends UnknownService, VALUE extends TYPE>(
                    this: THIS,
                    value: VALUE
                ): Supplier<THIS> {
                    return {
                        get: () => value,
                        supplies: {} as never,
                        market: {} as never,
                        service: this,
                        _ctx: (() => null) as never,
                        _requested: true as const
                    } as any
                },
                _type: null as unknown as TYPE,
                _param: true as const,
                _mock: false as const
            }
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
            plan: PartialModulePlan<TYPE, REQUIRED, OPTIONALS>
        ): ModuleGuard<
            Module<
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
            >,
            [...REQUIRED, ...OPTIONALS]
        > {
            assertTM(tm)
            assertModulePlan(tm, plan)

            return {
                ...main(tm, plan),
                mock: Mock<TM, TYPE>(),
                hire: Hire(),
                _mock: false as const
            } satisfies Module<
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
            >
        }
    }
}

export { index, sleep, once } from "#utils"
export * from "#types/public"

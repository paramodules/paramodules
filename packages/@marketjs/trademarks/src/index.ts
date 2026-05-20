import { Hire } from "#service/hire"
import { main } from "#service/main"
import { Mock } from "#service/mock"
import { type PartialServicePlan } from "#types/internal"
import type { ToSpecify } from "#types/records"
import type { ServiceGuard } from "#types/guards"
import { assertName, assertServicePlan } from "#validation"
import type {
    OriginalTM,
    Service,
    Spec,
    UnknownTM,
    Supply
} from "#types/public"

export function tm<NAME extends string>(name: NAME) {
    return {
        spec<TYPE = any>(): Spec<NAME, TYPE> {
            return {
                name,
                of<THIS extends UnknownTM, VALUE extends TYPE>(
                    this: THIS,
                    value: VALUE
                ): Supply<THIS> {
                    return {
                        unpack: () => value,
                        deps: {} as never,
                        supplies: {} as never,
                        tm: this,
                        _ctx: (() => null) as never,
                        _fromFactory: false as const
                    } as any
                },
                _type: null as unknown as TYPE,
                _spec: true as const,
                _mock: false as const
            }
        },
        /**
         * Creates a service that can assemble complex objects from dependencies.
         * Services can depend on other specs and services and have factory functions for creation.
         *
         * @typeParam CONSTRAINT - The type constraint for values this service produces
         * @typeParam SERVICES - Array of services this service depends on
         * @typeParam OPTIONALS - Array of optional request services this service may depend on
         * @param plan - Plan for the service
         * @param plan.services - Array of services this service depends on
         * @param plan.optionals - Array of optional request services this service may depend on
         * @param plan.factory - Factory function that creates the value from its dependencies
         * @param plan.warmup - Optional function called after the factory returns (see README for eager / lazy / warmed patterns)
         *
         * @returns An app service with methods like assemble, pack, mock, and hire
         * @public
         */
        service<
            TYPE,
            REQUIRED extends OriginalTM[] = [],
            OPTIONALS extends Spec[] = []
        >(
            plan: PartialServicePlan<TYPE, REQUIRED, OPTIONALS>
        ): ServiceGuard<
            Service<
                NAME,
                TYPE,
                OPTIONALS[number]["name"],
                Record<never, never>,
                ToSpecify<
                    {
                        required: REQUIRED
                        optionals: OPTIONALS
                    },
                    Record<never, never>
                >,
                [],
                false
            >,
            [...REQUIRED, ...OPTIONALS]
        > {
            assertName(name)
            assertServicePlan(name, plan)

            return {
                ...main(name, plan),
                mock: Mock<NAME, TYPE>(),
                hire: Hire(),
                _mock: false as const
            } satisfies Service<
                NAME,
                TYPE,
                OPTIONALS[number]["name"],
                Record<never, never>,
                ToSpecify<
                    {
                        required: REQUIRED
                        optionals: OPTIONALS
                    },
                    Record<never, never>
                >,
                [],
                false
            >
        }
    }
}

export { index, sleep, once } from "#utils"
export * from "#types/public"

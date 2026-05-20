import type {
    OriginalTM as OriginalTM,
    Spec,
    UnknownService,
    UnknownTM,
    Supply
} from "#types/public"
import type { Deps, ToSpecify } from "#types/records"
import type { Merge } from "#utils"

export interface TM<NAME extends string = string, TYPE = unknown> {
    name: NAME
    of: <THIS extends UnknownTM, VALUE extends TYPE>(
        this: THIS,
        value: VALUE
    ) => Supply<THIS>
    _type: TYPE
}

export type Factory<
    TYPE,
    REQUIRED extends OriginalTM[] = [],
    OPTIONALS extends Spec[] = []
> = (
    deps: Deps<{
        required: REQUIRED
        optionals: OPTIONALS
    }>,
    ctx: Ctx<{
        required: REQUIRED
        optionals: OPTIONALS
    }>
) => TYPE

type Warmup<
    TYPE,
    REQUIRED extends OriginalTM[] = [],
    OPTIONALS extends Spec[] = []
> = (
    value: TYPE,
    deps: Deps<{
        required: REQUIRED
        optionals: OPTIONALS
    }>
) => void

export type PartialServicePlan<
    TYPE,
    REQUIRED extends OriginalTM[] = [],
    OPTIONALS extends Spec[] = []
> = {
    required?: [...REQUIRED]
    optionals?: [...OPTIONALS]
    factory: Factory<TYPE, REQUIRED, OPTIONALS>
    warmup?: Warmup<TYPE, REQUIRED, OPTIONALS>
}

export type ServicePlan<
    TYPE,
    REQUIRED extends OriginalTM[],
    OPTIONALS extends Spec[]
> = {
    required: [...REQUIRED]
    optionals: [...OPTIONALS]
    factory: Factory<TYPE, REQUIRED, OPTIONALS>
    warmup: Warmup<TYPE, REQUIRED, OPTIONALS>
}

export type UnknownServicePlan = ServicePlan<unknown, OriginalTM[], Spec[]>

/**
 * ctx transforms services into contextualized services that can be assembled again with new request supplies.
 * This enables dynamic dependency injection within a service's factory.
 * @typeParam SERVICE - The current service providing context
 * @returns A function that takes a service and returns it with a contextualized assemble method
 * @public
 */
export type Ctx<
    PLAN extends Pick<UnknownServicePlan, "optionals" | "required">,
    KNOWN extends Required<ToSpecify<PLAN, Record<never, never>>> = Required<
        ToSpecify<PLAN, Record<never, never>>
    >
> = <TM extends UnknownTM>(
    tm: TM & (UnknownTM | Spec)
) => TM extends UnknownService ?
    Merge<
        TM,
        {
            _known: KNOWN
            _toSpecify: Omit<TM["_toSpecify"], keyof KNOWN> & Partial<KNOWN>
            _deps: TM["_deps"]
        }
    >
:   TM & Spec // simply returns the service itself if it's a request service (noop)

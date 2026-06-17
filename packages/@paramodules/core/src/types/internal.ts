import type {
    OriginalService as OriginalService,
    Param,
    UnknownService,
    Supplier,
    Ctx
} from "#types/public"
import type { SuppliesPlan } from "#types/records"

export interface Service<TM extends string = string, TYPE = unknown> {
    tm: TM
    of: <THIS extends UnknownService, VALUE extends TYPE>(
        this: THIS,
        value: VALUE
    ) => Supplier<THIS>
    _type: TYPE
}

export type Factory<
    TYPE,
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Param[] = []
> = (
    supplies: SuppliesPlan<{
        required: REQUIRED
        optionals: OPTIONALS
    }>,
    ctx: Ctx<{
        _required: REQUIRED
        _optionals: OPTIONALS
    }>
) => TYPE

export type Warmup<
    TYPE,
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Param[] = []
> = (
    value: TYPE,
    supplies: SuppliesPlan<{
        required: REQUIRED
        optionals: OPTIONALS
    }>
) => void

export type ModulePlan<
    TYPE,
    REQUIRED extends OriginalService[],
    OPTIONALS extends Param[]
> = {
    required: [...REQUIRED]
    optionals: [...OPTIONALS]
    factory: Factory<TYPE, REQUIRED, OPTIONALS>
    warmup: Warmup<TYPE, REQUIRED, OPTIONALS>
}

export type UnknownModulePlan = ModulePlan<unknown, OriginalService[], Param[]>

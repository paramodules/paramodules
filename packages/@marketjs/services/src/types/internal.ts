import type {
    OriginalService as OriginalService,
    Spec,
    UnknownModule,
    UnknownService,
    Supplier,
    ModuleSupplier
} from "#types/public"
import type { SuppliesPlan, MarketPlan, ToSpecify } from "#types/records"
import type { Merge } from "#utils"

export interface Service<TM extends string = string, TYPE = unknown> {
    tm: TM
    of: <THIS extends UnknownService, VALUE extends TYPE>(
        this: THIS,
        value: VALUE
    ) => Supplier<THIS>
    _type: TYPE
    /**
     * Opaque value attached at trademark creation by an adapter (e.g. a React
     * Context, a Vue inject key, an AsyncLocalStorage instance). Core
     * trademarks does not interpret this field — it just stores it for the
     * adapter to consume.
     */
    _context?: unknown
}

export type Factory<
    TYPE,
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Spec[] = []
> = (
    supplies: SuppliesPlan<{
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
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Spec[] = []
> = (
    value: TYPE,
    supplies: SuppliesPlan<{
        required: REQUIRED
        optionals: OPTIONALS
    }>
) => void

export type PartialModulePlan<
    TYPE,
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Spec[] = []
> = {
    required?: [...REQUIRED]
    optionals?: [...OPTIONALS]
    factory: Factory<TYPE, REQUIRED, OPTIONALS>
    warmup?: Warmup<TYPE, REQUIRED, OPTIONALS>
    context?: unknown
}

export type ModulePlan<
    TYPE,
    REQUIRED extends OriginalService[],
    OPTIONALS extends Spec[]
> = {
    required: [...REQUIRED]
    optionals: [...OPTIONALS]
    factory: Factory<TYPE, REQUIRED, OPTIONALS>
    warmup: Warmup<TYPE, REQUIRED, OPTIONALS>
    context?: unknown
}

export type UnknownModulePlan = ModulePlan<unknown, OriginalService[], Spec[]>

/**
 * ctx transforms modules into contextualized modules that can be called again with new specs.
 * This enables dynamic dependency injection within a module's factory.
 * @typeParam MODULE - The current module providing context
 * @returns A function that takes a module and returns it with a contextualized call method
 * @public
 */
export type Ctx<
    CALLER_PLAN extends Pick<UnknownModulePlan, "optionals" | "required">
> = <Service extends UnknownService>(
    service: Service & (UnknownService | Spec)
) => Service extends UnknownModule ?
    Merge<
        Service,
        {
            _caller: Merge<
                ModuleSupplier<UnknownModule>,
                { market: MarketPlan<CALLER_PLAN> }
            >
            _toSpecifyType: Omit<
                Service["_toSpecifyType"],
                keyof ToSpecify<CALLER_PLAN>
            > &
                Partial<ToSpecify<CALLER_PLAN>>
        }
    >
:   Service & Spec // simply returns the service itself if it's a request service (noop)

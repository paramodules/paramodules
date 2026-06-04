import type {
    OriginalService as OriginalService,
    Param,
    UnknownModule,
    UnknownService,
    Supplier,
    ModuleSupplier
} from "#types/public"
import type { SuppliesPlan, MarketPlan, Request } from "#types/records"
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
    OPTIONALS extends Param[] = []
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
    OPTIONALS extends Param[] = []
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
    OPTIONALS extends Param[] = []
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
    OPTIONALS extends Param[]
> = {
    required: [...REQUIRED]
    optionals: [...OPTIONALS]
    factory: Factory<TYPE, REQUIRED, OPTIONALS>
    warmup: Warmup<TYPE, REQUIRED, OPTIONALS>
    context?: unknown
}

export type UnknownModulePlan = ModulePlan<unknown, OriginalService[], Param[]>

/**
 * ctx transforms modules into contextualized modules that can be called again with new specs.
 * This enables dynamic dependency injection within a module's factory.
 * @typeParam MODULE - The current module providing context
 * @returns A function that takes a module and returns it with a contextualized call method
 * @public
 */
export type Ctx<
    CALLER_PLAN extends Pick<UnknownModulePlan, "optionals" | "required">
> = <SERVICE extends UnknownService>(
    service: SERVICE & UnknownService
) => SERVICE extends UnknownModule ?
    Merge<
        SERVICE,
        {
            _caller: Merge<
                ModuleSupplier<UnknownModule>,
                { market: MarketPlan<CALLER_PLAN> }
            >
            _reqType: Omit<SERVICE["_reqType"], keyof Request<CALLER_PLAN>> &
                Partial<Request<CALLER_PLAN>>
        }
    >
:   SERVICE & Param // simply returns the service itself if it's a request service (noop)

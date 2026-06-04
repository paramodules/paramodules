import type { ModuleGuard } from "#types/guards"
import type { Service, PartialModulePlan, Ctx } from "#types/internal"
import type {
    Market,
    MarketRecord,
    RegistryRecord,
    Supplies,
    Request
} from "#types/records"
import type { MergeStringTuples } from "#types/utils"
import type { Merge } from "#utils"

export interface Param<NAME extends string = string, TYPE = unknown>
    extends Service<NAME, TYPE> {
    _type: TYPE
    _param: true
    _mock: false
}

export interface Module<
    NAME extends string,
    TYPE,
    OPTIONAL_KEYS extends string,
    CALLER extends ModuleSupplier<UnknownModule> | undefined,
    REQUEST extends Partial<MarketRecord<UnknownService>>,
    HIRED extends string[],
    MOCK extends boolean = boolean
> extends Service<NAME, TYPE> {
    /** Calls the module by providing the specified dependencies */
    request: <THIS extends UnknownModule>(
        this: THIS,
        req: THIS["_reqType"]
    ) => Supplier<THIS>
    provision: <THIS extends UnknownModule>(this: THIS) => THIS
    mock: <
        THIS extends UnknownModule & {
            tm: NAME
            _type: TYPE
            _mock: false
        },
        TYPE2 extends THIS["_type"],
        REQUIRED2 extends OriginalService[] = [],
        OPTIONALS2 extends Param[] = []
    >(
        this: THIS,
        plan: PartialModulePlan<TYPE2, REQUIRED2, OPTIONALS2>
    ) => ModuleGuard<
        Mock<THIS, TYPE2, REQUIRED2, OPTIONALS2>,
        [...REQUIRED2, ...OPTIONALS2]
    >
    hire: <THIS extends UnknownModule, HIRED extends UnknownModule[] = []>(
        this: THIS,
        ...hired: [...HIRED]
    ) => ModuleGuard<
        Module<
            THIS["tm"],
            THIS["_type"],
            THIS["_optionalKeys"],
            THIS["_caller"],
            Merge<
                {
                    [SERVICE in HIRED[number] as SERVICE["tm"]]?: Supplier<SERVICE>
                },
                Merge<
                    Omit<THIS["_reqType"], keyof HIRED[number]["_oldReqType"]>,
                    HIRED[number]["_reqType"]
                >
            >,
            MergeStringTuples<
                THIS["_hired"],
                {
                    [K in keyof HIRED]: HIRED[K]["tm"]
                }
            >,
            THIS["_mock"]
        >,
        HIRED
    >
    _module: true
    _param: false
    _type: TYPE
    _optionalKeys: OPTIONAL_KEYS
    _caller: CALLER
    _reqType: REQUEST
    _suppliesType: Supplies<REQUEST, OPTIONAL_KEYS>
    _oldReqType: REQUEST
    _oldSuppliesType: Supplies<REQUEST, OPTIONAL_KEYS>
    /** Array of services this service depends on */
    _required: OriginalService[]
    /** Array of optional request services this service may depend on */
    _optionals: Param[]
    _team: UnknownService[]
    _hired: HIRED
    /** Factory function that creates the service's value from its dependencies */
    _factory: (deps: any, ctx: any) => any
    /** Optional initialization function called after factory */
    _warmup?: (value: any, deps: any) => void
    _resolve: <THIS extends UnknownModule>(
        this: THIS,
        lazyMarket: RegistryRecord
    ) => Supplier<THIS>
    _mock: MOCK
}

export type UnknownService = UnknownModule | Param
export type OriginalService = UnknownService & {
    _mock: false
}

export type UnknownModule = Module<
    string,
    unknown,
    string,
    ModuleSupplier<UnknownModule> | undefined,
    Partial<MarketRecord<any>>,
    string[],
    boolean
>

export type Mock<
    MODULE extends UnknownModule,
    TYPE2 extends MODULE["_type"],
    REQUIRED2 extends OriginalService[] = [],
    OPTIONALS2 extends Param[] = []
> = Omit<
    Module<
        MODULE["tm"],
        TYPE2,
        OPTIONALS2[number]["tm"],
        undefined,
        Request<{
            required: REQUIRED2
            optionals: OPTIONALS2
        }>,
        [],
        true
    >,
    "_mock" | "_oldReqType" | "_oldSuppliesType"
> & {
    _mock: true
    _oldReqType: MODULE["_reqType"]
    _oldSuppliesType: MODULE["_suppliesType"]
}

/**
 * Represents a supply - The result of assembling a service
 * with all its app and request dependencies, which can easily be passed
 * to other services.
 *
 * @typeParam NAME - The unique identifier name for this supply
 * @typeParam VALUE - The type of value this supply holds
 * @public
 */
export type ModuleSupplier<MODULE extends UnknownModule> = {
    service: MODULE
    get: () => MODULE["_type"]
    supplies: MODULE["_suppliesType"]
    market: Market<MODULE>
    _requested: boolean
}

export type SpecSupplier<SPEC extends Param> = {
    service: SPEC
    get: () => SPEC["_type"]
    _requested: true
}

export type Supplier<SERVICE extends UnknownService> =
    SERVICE extends Param ? SpecSupplier<SERVICE>
    :   ModuleSupplier<Extract<SERVICE, UnknownModule>>

import type { ModuleGuard } from "#types/guards"
import type { Service, PartialModulePlan, Ctx } from "#types/internal"
import type {
    Market,
    MarketRecord,
    RegistryRecord,
    Supplies,
    ToSpecify
} from "#types/records"
import type { MergeStringTuples } from "#types/utils"
import type { Merge } from "#utils"

export interface Spec<NAME extends string = string, TYPE = unknown>
    extends Service<NAME, TYPE> {
    _type: TYPE
    _spec: true
    _mock: false
}

export interface Module<
    NAME extends string,
    TYPE,
    OPTIONAL_KEYS extends string,
    CALLER extends ModuleSupplier<UnknownModule> | undefined,
    TO_SPECIFY extends Partial<MarketRecord<UnknownService>>,
    HIRED extends string[],
    MOCK extends boolean = boolean
> extends Service<NAME, TYPE> {
    /** Calls the module by providing the specified dependencies */
    call: <THIS extends UnknownModule>(
        this: THIS,
        specified: THIS["_toSpecifyType"]
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
        OPTIONALS2 extends Spec[] = []
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
                    Omit<
                        THIS["_toSpecifyType"],
                        keyof HIRED[number]["_oldToSpecifyType"]
                    >,
                    HIRED[number]["_toSpecifyType"]
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
    _spec: false
    _type: TYPE
    _optionalKeys: OPTIONAL_KEYS
    _caller: CALLER
    _toSpecifyType: TO_SPECIFY
    _suppliesType: Supplies<TO_SPECIFY, OPTIONAL_KEYS>
    _oldToSpecifyType: TO_SPECIFY
    _oldSuppliesType: Supplies<TO_SPECIFY, OPTIONAL_KEYS>
    /** Array of services this service depends on */
    _required: OriginalService[]
    /** Array of optional request services this service may depend on */
    _optionals: Spec[]
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

export type UnknownService = UnknownModule | Spec
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
    OPTIONALS2 extends Spec[] = []
> = Omit<
    Module<
        MODULE["tm"],
        TYPE2,
        OPTIONALS2[number]["tm"],
        undefined,
        ToSpecify<{
            required: REQUIRED2
            optionals: OPTIONALS2
        }>,
        [],
        true
    >,
    "_mock" | "_oldToSpecifyType" | "_oldSuppliesType"
> & {
    _mock: true
    _oldToSpecifyType: MODULE["_toSpecifyType"]
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
    _specified: boolean
}

export type SpecSupplier<SPEC extends Spec> = {
    service: SPEC
    get: () => SPEC["_type"]
    _specified: true
}

export type Supplier<SERVICE extends UnknownService> =
    SERVICE extends Spec ? SpecSupplier<SERVICE>
    :   ModuleSupplier<Extract<SERVICE, UnknownModule>>

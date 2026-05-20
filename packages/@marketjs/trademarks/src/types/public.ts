import type { ServiceGuard } from "#types/guards"
import type { TM, Ctx, PartialServicePlan } from "#types/internal"
import type {
    ResolvedRecord,
    SuppliesRecord,
    SupplyDeps,
    ToSpecify as ToSpecify
} from "#types/records"
import type { MergeStringTuples } from "#types/utils"
import type { Merge } from "#utils"

export interface Spec<NAME extends string = string, TYPE = unknown>
    extends TM<NAME, TYPE> {
    _type: TYPE
    _spec: true
    _mock: false
}

export interface Service<
    NAME extends string,
    TYPE,
    OPTIONAL_KEYS extends string,
    KNOWN extends ResolvedRecord<UnknownTM>,
    TO_SPECIFY extends Partial<ResolvedRecord<UnknownTM>>,
    HIRED extends string[],
    MOCK extends boolean = boolean
> extends TM<NAME, TYPE> {
    /** Assembles the service by providing request supplies and auto-wiring app dependencies */
    buy: <THIS extends UnknownService>(
        this: THIS,
        specified: THIS["_toSpecify"]
    ) => Supply<THIS>
    provision: <THIS extends UnknownService>(this: THIS) => THIS
    mock: <
        THIS extends UnknownService & {
            name: NAME
            _type: TYPE
            _mock: false
        },
        TYPE2 extends THIS["_type"],
        REQUIRED2 extends OriginalTM[] = [],
        OPTIONALS2 extends Spec[] = []
    >(
        this: THIS,
        plan: PartialServicePlan<TYPE2, REQUIRED2, OPTIONALS2>
    ) => ServiceGuard<
        Mock<THIS, TYPE2, REQUIRED2, OPTIONALS2>,
        [...REQUIRED2, ...OPTIONALS2]
    >
    hire: <THIS extends UnknownService, HIRED extends UnknownService[] = []>(
        this: THIS,
        ...hired: [...HIRED]
    ) => ServiceGuard<
        Service<
            THIS["name"],
            THIS["_type"],
            THIS["_optionalKeys"],
            THIS["_known"],
            Merge<
                {
                    [SERVICE in HIRED[number] as SERVICE["name"]]?: Supply<SERVICE>
                },
                Merge<
                    Omit<
                        THIS["_toSpecify"],
                        keyof HIRED[number]["_oldToSpecify"]
                    >,
                    HIRED[number]["_toSpecify"]
                >
            >,
            MergeStringTuples<
                THIS["_hired"],
                {
                    [K in keyof HIRED]: HIRED[K]["name"]
                }
            >,
            THIS["_mock"]
        >,
        HIRED
    >
    _service: true
    _spec: false
    _type: TYPE
    _optionalKeys: OPTIONAL_KEYS
    _known: KNOWN
    _toSpecify: TO_SPECIFY
    _deps: SupplyDeps<TO_SPECIFY, OPTIONAL_KEYS>
    _oldToSpecify: TO_SPECIFY
    _oldDeps: SupplyDeps<TO_SPECIFY, OPTIONAL_KEYS>
    /** Array of services this service depends on */
    _required: OriginalTM[]
    /** Array of optional request services this service may depend on */
    _optionals: Spec[]
    _team: UnknownTM[]
    _hired: HIRED
    /** Factory function that creates the service's value from its dependencies */
    _factory: (deps: any, ctx: Ctx<any, any>) => any
    /** Optional initialization function called after factory */
    _warmup?: (value: any, deps: any) => void
    _build: <THIS extends UnknownService>(
        this: THIS,
        supplies: SuppliesRecord
    ) => Supply<THIS>
    _mock: MOCK
}

export type UnknownTM = UnknownService | Spec
export type OriginalTM = UnknownTM & {
    _mock: false
}

export type UnknownService = Service<
    string,
    unknown,
    string,
    ResolvedRecord<any>,
    Partial<ResolvedRecord<any>>,
    string[],
    boolean
>

export type Mock<
    SERVICE extends UnknownService,
    TYPE2 extends SERVICE["_type"],
    REQUIRED2 extends OriginalTM[] = [],
    OPTIONALS2 extends Spec[] = []
> = Omit<
    Service<
        SERVICE["name"],
        TYPE2,
        OPTIONALS2[number]["name"],
        Record<never, never>,
        ToSpecify<
            {
                required: REQUIRED2
                optionals: OPTIONALS2
            },
            Record<never, never>
        >,
        [],
        true
    >,
    "_mock" | "_oldResolved" | "_oldToSpecify" | "_oldDeps"
> & {
    _mock: true
    _oldToSpecify: SERVICE["_toSpecify"]
    _oldDeps: SERVICE["_deps"]
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
export type ServiceSupply<SERVICE extends UnknownService> = {
    name: SERVICE["name"]
    unpack: () => SERVICE["_type"]
    deps: SERVICE["_deps"]
    market: {
        [NAME in keyof SERVICE["_toSpecify"]]-?: NonNullable<
            SERVICE["_toSpecify"][NAME]
        >
    }
    tm: SERVICE
    _ctx: Ctx<any>
    _packed: boolean
}

export type SpecSupply<SPEC extends Spec> = {
    name: SPEC["name"]
    unpack: () => SPEC["_type"]
    tm: SPEC
    _packed: boolean
}

export type Supply<SERVICE extends UnknownTM> =
    SERVICE extends Spec ? SpecSupply<SERVICE>
    :   ServiceSupply<Extract<SERVICE, UnknownService>>

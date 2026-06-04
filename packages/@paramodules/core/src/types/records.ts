import type { UnknownModulePlan } from "#types/internal"
import type {
    Supplier,
    UnknownService,
    Param,
    Module,
    UnknownModule
} from "#types/public"
import type { UnionToIntersection } from "#utils"

export type MaybeFn<A extends any[], R> = R | ((...args: A) => R)
/**
 * A generic map of suppliers
 * @public
 */
export type RegistryRecord<SERVICE extends UnknownService = UnknownService> =
    Record<string, MaybeFn<[], Supplier<SERVICE>>>

/**
 * A generic map of resolved supplies
 * @public
 */
export type MarketRecord<SERVICE extends UnknownService = UnknownService> =
    Record<string, Supplier<SERVICE>>

/**
 * A generic map of supplies or undefined. Undefined used to force a supply not to be preserved across reassembly.
 * @public
 */
export type RegistryOrUndefinedRecord<
    SERVICE extends UnknownService = UnknownService
> = Record<string, MaybeFn<[], Supplier<SERVICE>> | undefined>

type FindSupplyFirstAppearanceInServiceTuple<
    SERVICES extends UnknownService[],
    KEY extends "_reqType" | "_suppliesType",
    NAME extends PropertyKey
> =
    SERVICES extends [infer Head, ...infer Tail] ?
        Tail extends UnknownService[] ?
            Head extends UnknownModule ?
                NAME extends keyof Head[KEY] ?
                    Head[KEY][NAME]
                :   FindSupplyFirstAppearanceInServiceTuple<Tail, KEY, NAME>
            :   FindSupplyFirstAppearanceInServiceTuple<Tail, KEY, NAME>
        :   never
    :   never

type RequestBase<
    PLAN extends Pick<UnknownModulePlan, "optionals"> & {
        required: UnknownService[]
    }
> = {
    [SERVICE in Extract<
        PLAN["required"][number],
        Param
    > as SERVICE["tm"]]: Supplier<SERVICE>
} & {
    [OPTIONAL in
        | PLAN["optionals"][number]
        | Exclude<
              PLAN["required"][number],
              Param
          > as OPTIONAL["tm"]]?: OPTIONAL extends Param ? Supplier<OPTIONAL>
    : OPTIONAL extends UnknownModule ?
        Supplier<
            Module<
                OPTIONAL["tm"],
                OPTIONAL["_type"],
                OPTIONAL["_optionalKeys"],
                OPTIONAL["_caller"],
                Partial<MarketRecord<UnknownService>>,
                OPTIONAL["_hired"],
                OPTIONAL["_mock"]
            >
        >
    :   never
}

export type Request<
    PLAN extends Pick<UnknownModulePlan, "optionals"> & {
        required: UnknownService[]
    }
> =
    any[] extends PLAN["required"] ? any
    :   RequestBase<PLAN> & {
            [NAME in keyof UnionToIntersection<
                Extract<PLAN["required"][number], UnknownModule>["_reqType"]
            > as NAME extends keyof RequestBase<PLAN> ? never
            :   NAME]: FindSupplyFirstAppearanceInServiceTuple<
                PLAN["required"],
                "_reqType",
                NAME
            >
        }

export type Market<MODULE extends UnknownModule> = {
    [NAME in keyof MODULE["_reqType"]]-?: NonNullable<MODULE["_reqType"][NAME]>
}

export type MarketPlan<
    PLAN extends Pick<UnknownModulePlan, "optionals"> & {
        required: UnknownService[]
    }
> = {
    [NAME in keyof Request<PLAN>]-?: NonNullable<Request<PLAN>[NAME]>
}

type SuppliesBase<
    PLAN extends Pick<UnknownModulePlan, "optionals"> & {
        required: UnknownService[]
    }
> = {
    [SERVICE in
        | PLAN["required"][number]
        | PLAN["optionals"][number] as SERVICE["tm"]]: SERVICE extends (
        PLAN["required"][number]
    ) ?
        SERVICE["_type"]
    :   SERVICE["_type"] | undefined
}

export type SuppliesPlan<
    PLAN extends Pick<UnknownModulePlan, "optionals"> & {
        required: UnknownService[]
    }
> =
    any[] extends PLAN["required"] ? any
    :   SuppliesBase<PLAN> & {
            [NAME in keyof UnionToIntersection<
                Extract<
                    PLAN["required"][number],
                    UnknownModule
                >["_suppliesType"]
            > as NAME extends keyof SuppliesBase<PLAN> ? never
            :   NAME]: FindSupplyFirstAppearanceInServiceTuple<
                PLAN["required"],
                "_suppliesType",
                NAME
            >
        }

export type Supplies<
    SPECIFIED extends Partial<MarketRecord<UnknownService>>,
    OPTIONAL_KEYS extends string
> =
    string extends keyof Required<SPECIFIED> ? any
    :   {
            [NAME in keyof SPECIFIED]-?: Required<SPECIFIED>[NAME] extends (
                Supplier<infer SERVICE>
            ) ?
                NAME extends OPTIONAL_KEYS ?
                    SERVICE["_type"] | undefined
                :   SERVICE["_type"]
            :   never
        }

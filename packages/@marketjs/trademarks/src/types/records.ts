import type { UnknownServicePlan } from "#types/internal"
import type {
    Supply,
    UnknownTM,
    Spec,
    Service,
    UnknownService
} from "#types/public"
import type { Merge, UnionToIntersection } from "#utils"

export type MaybeFn<A extends any[], R> = R | ((...args: A) => R)
/**
 * A generic map of supplies
 * @public
 */
export type SuppliesRecord<TM extends UnknownTM = UnknownTM> = Record<
    string,
    MaybeFn<[], Supply<TM>>
>

/**
 * A generic map of resolved supplies
 * @public
 */
export type ResolvedRecord<TM extends UnknownTM = UnknownTM> = Record<
    string,
    Supply<TM>
>

/**
 * A generic map of supplies or undefined. Undefined used to force a supply not to be preserved across reassembly.
 * @public
 */
export type SuppliesOrUndefinedRecord<TM extends UnknownTM = UnknownTM> =
    Record<string, MaybeFn<[], Supply<TM>> | undefined>

type ToSpecifyBase<
    PLAN extends Pick<UnknownServicePlan, "optionals"> & {
        required: UnknownTM[]
    }
> = {
    [SERVICE in Extract<
        PLAN["required"][number],
        Spec
    > as SERVICE["name"]]: Supply<SERVICE>
} & {
    [OPTIONAL in
        | PLAN["optionals"][number]
        | Exclude<
              PLAN["required"][number],
              Spec
          > as OPTIONAL["name"]]?: OPTIONAL extends Spec ? Supply<OPTIONAL>
    : OPTIONAL extends UnknownService ?
        Supply<
            Service<
                OPTIONAL["name"],
                OPTIONAL["_type"],
                OPTIONAL["_optionalKeys"],
                OPTIONAL["_known"],
                Partial<ResolvedRecord<UnknownTM>>,
                OPTIONAL["_hired"],
                OPTIONAL["_mock"]
            >
        >
    :   never
}

type FindDepFirstAppearanceInTMTuple<
    TMS extends UnknownTM[],
    KEY extends "_toSpecify" | "_deps",
    NAME extends PropertyKey
> =
    TMS extends [infer Head, ...infer Tail] ?
        Tail extends UnknownTM[] ?
            Head extends UnknownService ?
                NAME extends keyof Head[KEY] ?
                    Head[KEY][NAME]
                :   FindDepFirstAppearanceInTMTuple<Tail, KEY, NAME>
            :   FindDepFirstAppearanceInTMTuple<Tail, KEY, NAME>
        :   never
    :   never

export type ToSpecify<
    PLAN extends Pick<UnknownServicePlan, "optionals"> & {
        required: UnknownTM[]
    },
    KNOWN extends ResolvedRecord<UnknownTM>
> =
    any[] extends PLAN["required"] ? any
    :   Merge<
            ToSpecifyBase<PLAN> & {
                [NAME in keyof UnionToIntersection<
                    Extract<
                        PLAN["required"][number],
                        UnknownService
                    >["_toSpecify"]
                > as NAME extends keyof ToSpecifyBase<PLAN> ? never
                :   NAME]: FindDepFirstAppearanceInTMTuple<
                    PLAN["required"],
                    "_toSpecify",
                    NAME
                >
            },
            Partial<KNOWN>
        >

type DepsBase<
    PLAN extends Pick<UnknownServicePlan, "optionals"> & {
        required: UnknownTM[]
    }
> = {
    [SERVICE in
        | PLAN["required"][number]
        | PLAN["optionals"][number] as SERVICE["name"]]: SERVICE extends (
        PLAN["required"][number]
    ) ?
        SERVICE["_type"]
    :   SERVICE["_type"] | undefined
}

// Same as Resolved, but unpacked from the supply wrapper
export type Deps<
    PLAN extends Pick<UnknownServicePlan, "optionals"> & {
        required: UnknownTM[]
    }
> =
    any[] extends PLAN["required"] ? any
    :   DepsBase<PLAN> & {
            [NAME in keyof UnionToIntersection<
                Extract<PLAN["required"][number], UnknownService>["_deps"]
            > as NAME extends keyof DepsBase<PLAN> ? never
            :   NAME]: FindDepFirstAppearanceInTMTuple<
                PLAN["required"],
                "_deps",
                NAME
            >
        }

export type SupplyDeps<
    SPECIFIED extends Partial<ResolvedRecord<UnknownTM>>,
    OPTIONAL_KEYS extends string
> =
    string extends keyof Required<SPECIFIED> ? any
    :   {
            [NAME in keyof SPECIFIED]-?: Required<SPECIFIED>[NAME] extends (
                Supply<infer SERVICE>
            ) ?
                NAME extends OPTIONAL_KEYS ?
                    SERVICE["_type"] | undefined
                :   SERVICE["_type"]
            :   never
        }

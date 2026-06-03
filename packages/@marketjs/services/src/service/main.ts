import type { PartialModulePlan } from "#types/internal"
import { call, provision } from "#service/call"
import { _resolve } from "#service/resolve"
import { service } from "#index"
import type { Supplies, ToSpecify } from "#types/records"
import { dedupe, isModule } from "#utils"
import type {
    Module,
    OriginalService,
    Spec,
    UnknownService
} from "#types/public"

export function main<
    TM extends string,
    TYPE,
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Spec[] = [],
    TO_SPECIFY extends ToSpecify<{
        required: REQUIRED
        optionals: OPTIONALS
    }> = ToSpecify<{
        required: REQUIRED
        optionals: OPTIONALS
    }>
>(
    tm: TM,
    plan: PartialModulePlan<TYPE, REQUIRED, OPTIONALS>
): Omit<
    Module<
        TM,
        TYPE,
        OPTIONALS[number]["tm"],
        undefined,
        TO_SPECIFY,
        [],
        boolean
    >,
    "mock" | "hire" | "_mock"
> {
    const _team = team(tm, plan.required ?? [], plan.optionals ?? [])

    const _toSpecifyType = null as unknown as TO_SPECIFY

    const _suppliesType = null as unknown as Supplies<
        TO_SPECIFY,
        OPTIONALS[number]["tm"]
    >

    return {
        ...service(tm).spec<TYPE>({ context: plan.context }),
        call,
        provision,
        _factory: plan.factory,
        _resolve,
        _required: plan.required ?? [],
        _optionals: plan.optionals ?? [],
        _team,
        _hired: [] as [],
        _warmup: plan.warmup,
        _spec: false as const,
        _module: true as const,
        _type: null as unknown as TYPE,
        _caller: undefined,
        _optionalKeys: null as unknown as OPTIONALS[number]["tm"],
        _toSpecifyType: _toSpecifyType,
        _suppliesType,
        _oldToSpecifyType: _toSpecifyType,
        _oldSuppliesType: _suppliesType
    }
}

export function team(
    tm: string,
    required: UnknownService[],
    optionals: Spec[]
) {
    return dedupe(
        [...required, ...optionals]
            .flatMap((service) => {
                if (isModule(service)) {
                    return [service, ...service._team]
                }
                return [service]
            })
            .map((s) => {
                if (s.tm === tm) {
                    throw new Error("Circular dependency detected")
                }
                return s
            })
    )
}

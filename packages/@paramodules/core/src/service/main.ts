import type { PartialModulePlan } from "#types/internal"
import { request, provision } from "#service/request"
import { _resolve } from "#service/resolve"
import { service } from "#index"
import type { Supplies, Request } from "#types/records"
import { dedupe, isModule } from "#utils"
import type {
    Module,
    OriginalService,
    Param,
    UnknownService
} from "#types/public"

export function main<
    TM extends string,
    TYPE,
    REQUIRED extends OriginalService[] = [],
    OPTIONALS extends Param[] = [],
    REQUEST extends Request<{
        required: REQUIRED
        optionals: OPTIONALS
    }> = Request<{
        required: REQUIRED
        optionals: OPTIONALS
    }>
>(
    tm: TM,
    plan: PartialModulePlan<TYPE, REQUIRED, OPTIONALS>
): Omit<
    Module<TM, TYPE, OPTIONALS[number]["tm"], undefined, REQUEST, [], boolean>,
    "mock" | "hire" | "_mock"
> {
    const _team = team(tm, plan.required ?? [], plan.optionals ?? [])

    const _reqType = null as unknown as REQUEST

    const _suppliesType = null as unknown as Supplies<
        REQUEST,
        OPTIONALS[number]["tm"]
    >

    return {
        ...service(tm).param<TYPE>(),
        request: request,
        provision,
        _factory: plan.factory,
        _resolve,
        _required: plan.required ?? [],
        _optionals: plan.optionals ?? [],
        _team,
        _hired: [] as [],
        _warmup: plan.warmup,
        _param: false as const,
        _module: true as const,
        _type: null as unknown as TYPE,
        _caller: undefined,
        _optionalKeys: null as unknown as OPTIONALS[number]["tm"],
        _reqType,
        _suppliesType,
        _oldReqType: _reqType,
        _oldSuppliesType: _suppliesType
    }
}

export function team(
    tm: string,
    required: UnknownService[],
    optionals: Param[]
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

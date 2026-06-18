import type { PartialModulePlan, Supplier } from "#types/public"
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
import { assertTM } from "#validation"

export function param<TM extends string, TYPE = any>(
    tm: TM
): Param<TM, TYPE, never> {
    assertTM(tm)
    return {
        tm,
        of<THIS extends UnknownService, VALUE extends THIS["_type"]>(
            this: THIS,
            value: VALUE
        ): Supplier<THIS> {
            return {
                get: () => value,
                supplies: {} as never,
                market: {} as never,
                service: this,
                _ctx: (() => null) as never,
                _requested: true as const
            } as any
        },
        init<THIS extends Param>(this: THIS, value: THIS["_type"]) {
            return { ...this, _init: value } as Param<
                THIS["tm"],
                THIS["_type"],
                THIS["_type"]
            >
        },
        _type: null as unknown as TYPE,
        _param: true as const,
        _mock: false as const,
        _init: undefined as never
    }
}

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
        ...param<TM, TYPE>(tm),
        request: request,
        provision,
        invalidate,
        _factory: plan.factory,
        _resolve,
        _required: plan.required ?? [],
        _optionals: plan.optionals ?? [],
        _team,
        _hired: [] as [],
        _warmup: plan.warmup,
        _memo: plan.memo,
        _version: 0,
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

function invalidate<THIS extends { _memo?: unknown; _version: number; tm: string }>(
    this: THIS
) {
    if (!this._memo) {
        throw new Error(
            `Cannot invalidate "${this.tm}" because invalidate() only applies to memo-enabled modules.`
        )
    }
    this._version += 1
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

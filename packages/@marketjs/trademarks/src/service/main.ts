import type { PartialServicePlan } from "#types/internal"
import { assertServices } from "#validation"
import { buy, provision } from "#service/buy"
import { _build } from "#service/build"
import { tm } from "#index"
import type { SupplyDeps, ToSpecify } from "#types/records"
import { dedupe, isService } from "#utils"
import type { Service, OriginalTM, Spec, UnknownTM } from "#types/public"

export function main<
    NAME extends string,
    TYPE,
    REQUIRED extends OriginalTM[] = [],
    OPTIONALS extends Spec[] = []
>(
    name: NAME,
    plan: PartialServicePlan<TYPE, REQUIRED, OPTIONALS>
): Omit<
    Service<
        NAME,
        TYPE,
        OPTIONALS[number]["name"],
        Record<never, never>,
        ToSpecify<
            {
                required: REQUIRED
                optionals: OPTIONALS
            },
            Record<never, never>
        >,
        [],
        boolean
    >,
    "mock" | "hire" | "_mock"
> {
    assertServices(name, [], true)

    const _team = team(name, plan.required ?? [], plan.optionals ?? [])

    const _toSpecify = null as unknown as ToSpecify<
        {
            required: REQUIRED
            optionals: OPTIONALS
        },
        Record<never, never>
    >

    const _deps = null as unknown as SupplyDeps<
        typeof _toSpecify,
        OPTIONALS[number]["name"]
    >

    return {
        ...tm(name).spec<TYPE>(),
        buy,
        provision: provision,
        _factory: plan.factory,
        _build,
        _required: plan.required ?? [],
        _optionals: plan.optionals ?? [],
        _team,
        _hired: [] as [],
        _known: {},
        _warmup: plan.warmup,
        _spec: false as const,
        _service: true as const,
        _type: null as unknown as TYPE,
        _optionalKeys: null as unknown as OPTIONALS[number]["name"],
        _toSpecify,
        _deps,
        _oldToSpecify: _toSpecify,
        _oldDeps: _deps
    }
}

export function team(name: string, required: UnknownTM[], optionals: Spec[]) {
    return dedupe(
        [...required, ...optionals]
            .flatMap((service) => {
                if (isService(service)) {
                    return [service, ...service._team]
                }
                return [service]
            })
            .map((s) => {
                if (s.name === name) {
                    throw new Error("Circular dependency detected")
                }
                return s
            })
    )
}

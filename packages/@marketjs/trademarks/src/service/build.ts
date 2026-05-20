import type { Ctx, UnknownServicePlan } from "#types/internal"
import type { UnknownTM, Supply, UnknownService } from "#types/public"
import type { SuppliesRecord, ToSpecify } from "#types/records"
import { isService, once } from "#utils"

function createResolver(market: SuppliesRecord) {
    return once(() => {
        return Object.entries(market).reduce(
            (acc, [name, supply]) => {
                if (typeof supply === "function") {
                    acc[name] = supply()
                    return acc
                }

                acc[name] = supply
                return acc
            },
            {} as Record<string, any>
        )
    })
}

export function Ctx<
    PLAN extends Pick<UnknownServicePlan, "required" | "optionals">
>(
    plan: PLAN,
    resolved: Required<ToSpecify<PLAN, Record<never, never>>>
): Ctx<PLAN> {
    return <TM extends UnknownTM>(tm: TM): any => {
        const actual =
            plan.required.find((member) => member.name === tm.name) ?? tm

        if (!isService(actual)) {
            return actual
        }

        return {
            ...actual,
            _known: { ...actual._known, ...resolved }
        }
    }
}

/**
 * Internal build method that creates the actual supply.
 * This is separated from assemble() to allow for internal reuse during
 * reassembly and recursive dependency resolution. It creates the factory
 * closure with the deps and ctx accessors and handles initialization.
 *
 * @param this - The app service building the supply
 * @param market - The supply map providing resolved dependencies
 * @returns A supply instance with unpack(), deps, supplies, and ctx methods
 * @internal
 */

export function _build<THIS extends UnknownService>(
    this: THIS,
    market: SuppliesRecord
): Supply<THIS> {
    const resolve = createResolver(market)

    const { deps, resolved } = Object.keys(market).reduce(
        (acc, name) => {
            Object.defineProperty(acc.resolved, name, {
                get() {
                    return resolve()[name]
                },
                enumerable: true,
                configurable: true
            })

            Object.defineProperty(acc.deps, name, {
                get() {
                    return resolve()[name]?.unpack()
                },
                enumerable: true,
                configurable: true
            })
            return acc
        },
        {
            deps: {},
            resolved: {}
        }
    )

    const ctx = Ctx(
        { required: this._required, optionals: this._optionals },
        resolved
    )

    const supply = {
        unpack: once(() => {
            this._required.forEach((tm) => {
                if (!(tm.name in deps)) {
                    // This error will be catched in warmup phase, but will trigger if unpack() is called again afterwards.
                    throw new Error(`Dependency ${tm.name} is not available`)
                }
            })
            const value = this._factory(deps, ctx)
            if (this._warmup) {
                this._warmup(value, deps)
            }
            return value
        }),
        deps,
        market: resolved,
        tm: this,
        _ctx: ctx,
        _fromFactory: true as const
    }

    return supply as any
}

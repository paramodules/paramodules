import type { Ctx, UnknownAppServicePlan } from "#types/internal"
import type { Service, Supply, UnknownAppService } from "#types/public"
import type { SuppliesRecord, ToSupply } from "#types/records"
import { isAppService, once } from "#utils"

function createResolver(supplies: SuppliesRecord) {
    return once(() => {
        return Object.entries(supplies).reduce(
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
    PLAN extends Pick<UnknownAppServicePlan, "services" | "optionals">
>(
    plan: PLAN,
    resolved: Required<ToSupply<PLAN, Record<never, never>>>
): Ctx<PLAN> {
    return <SERVICE extends Service>(service: SERVICE): any => {
        const actual =
            plan.services.find((member) => member.name === service.name) ??
            service

        if (!isAppService(actual)) {
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
 * @param supplies - The supply map providing resolved dependencies
 * @returns A supply instance with unpack(), deps, supplies, and ctx methods
 * @internal
 */

export function _build<THIS extends UnknownAppService>(
    this: THIS,
    supplies: SuppliesRecord
): Supply<THIS> {
    const resolve = createResolver(supplies)

    const { deps, resolved } = Object.keys(supplies).reduce(
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
        { services: this._services, optionals: this._optionals },
        resolved
    )

    const supply = {
        unpack: once(() => {
            this._services.forEach((service) => {
                if (!(service.name in deps)) {
                    // This error will be catched in warmup phase, but will trigger if unpack() is called again afterwards.
                    throw new Error(
                        `Dependency ${service.name} is not available`
                    )
                }
            })
            const value = this._factory(deps, ctx)
            if (this._warmup) {
                this._warmup(value, deps)
            }
            return value
        }),
        deps,
        supplies: resolved,
        service: this,
        _ctx: ctx,
        _packed: false as const
    }

    return supply as any
}

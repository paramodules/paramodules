import type {
    Ctx,
    UnknownService,
    Supplier,
    UnknownModule,
    ModuleSupplier
} from "#types/public"
import type { MarketPlan, RegistryRecord, SuppliesPlan } from "#types/records"
import { isModule, once, type Merge } from "#utils"

export function Ctx<
    SUPPLIER extends Merge<
        ModuleSupplier<UnknownModule>,
        {
            market: MarketPlan<{
                required: Pick<MODULE, "_required">["_required"]
                optionals: Pick<MODULE, "_optionals">["_optionals"]
            }>
        }
    >,
    MODULE extends Pick<UnknownModule, "_required" | "_optionals">
>(callerSupplier: SUPPLIER, callerModule: MODULE): Ctx<MODULE> {
    return <SERVICE extends Pick<UnknownService, "tm">>(
        service: SERVICE
    ): any => {
        const actual =
            callerModule._required.find((member) => member.tm === service.tm) ??
            service

        if (!isModule(actual)) {
            return actual
        }

        return {
            ...actual,
            _caller: callerSupplier
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
 * @param registry - The supply map providing resolved dependencies
 * @returns A supply instance with unpack(), deps, supplies, and ctx methods
 * @internal
 */
export function _resolve<THIS extends UnknownModule>(
    this: THIS,
    registry: RegistryRecord
): Supplier<THIS> {
    const { supplies, market } = Object.entries(registry).reduce(
        (acc, [name, registration]) => {
            const loadSupplier = once(() => {
                if (typeof registration === "function") {
                    return registration()
                }
                return registration
            })
            Object.defineProperty(acc.market, name, {
                get() {
                    return loadSupplier()
                },
                enumerable: true,
                configurable: true
            })

            Object.defineProperty(acc.supplies, name, {
                get() {
                    return loadSupplier()?.get()
                },
                enumerable: true,
                configurable: true
            })
            return acc
        },
        {
            supplies: {} as SuppliesPlan<{
                required: THIS["_required"]
                optionals: THIS["_optionals"]
            }>,
            market: {} as MarketPlan<{
                required: THIS["_required"]
                optionals: THIS["_optionals"]
            }>
        }
    )

    const supplier = {
        tm: this.tm,
        get: once(() => {
            this._required.forEach((service) => {
                if (!(service.tm in supplies)) {
                    // This error will be catched in warmup phase, but will trigger if unpack() is called again afterwards.
                    throw new Error(`Dependency ${service.tm} is not available`)
                }
            })
            const value = this._factory(supplies, Ctx(supplier, this))
            if (this._warmup) {
                this._warmup(value, supplies)
            }
            return value
        }),
        market,
        supplies,
        service: this,
        _ctx<SERVICE extends UnknownService>(service: SERVICE) {
            return Ctx(supplier, this.service)(service)
        },
        _requested: false as const
    }

    return supplier as any
}

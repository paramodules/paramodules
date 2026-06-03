import type { Ctx, UnknownModulePlan } from "#types/internal"
import type {
    UnknownService,
    Supplier,
    UnknownModule,
    ModuleSupplier
} from "#types/public"
import type { MarketPlan, RegistryRecord } from "#types/records"
import { isModule, once, type Merge } from "#utils"

export function Ctx<
    SUPPLIER extends Merge<
        ModuleSupplier<UnknownModule>,
        { market: MarketPlan<PLAN> }
    >,
    PLAN extends Pick<UnknownModulePlan, "required" | "optionals">
>(callerSupplier: SUPPLIER, callerPlan: PLAN): Ctx<PLAN> {
    return <TM extends UnknownService>(tm: TM): any => {
        const actual =
            callerPlan.required.find((member) => member.tm === tm.tm) ?? tm

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
            supplies: {},
            market: {}
        }
    )

    const supplier = {
        tm: this.tm,
        get: once(() => {
            this._required.forEach((tm) => {
                if (!(tm.tm in supplies)) {
                    // This error will be catched in warmup phase, but will trigger if unpack() is called again afterwards.
                    throw new Error(`Dependency ${tm.tm} is not available`)
                }
            })
            const value = this._factory(
                supplies,
                Ctx(supplier, {
                    required: this._required,
                    optionals: this._optionals
                })
            )
            if (this._warmup) {
                this._warmup(value, supplies)
            }
            return value
        }),
        market,
        supplies,
        service: this,
        _ctx<TM extends UnknownService>(tm: TM) {
            return Ctx(supplier, {
                required: this.service._required,
                optionals: this.service._optionals
            })(tm)
        },
        _specified: false as const
    }

    return supplier as any
}

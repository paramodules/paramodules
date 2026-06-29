import type {
    Ctx,
    UnknownService,
    Supplier,
    UnknownModule,
    ModuleSupplier,
    CachingConfig
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
 * Internal resolve method that creates the actual supplier.
 *
 * @param this - The module building the supplier
 * @param registry - The supplier map providing resolved dependencies
 * @returns A supplier instance with get(), supplies, market, service, _ctx, and _requested methods
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

    const factoryRunner = () => {
        this._required.forEach((service) => {
            if (!(service.tm in supplies)) {
                // This error will be catched in warmup phase, but will trigger if get() is called again afterwards.
                throw new Error(`Dependency ${service.tm} is not available`)
            }
        })
        const value = this._factory(supplies, Ctx(supplier, this))
        if (this._warmup) {
            this._warmup(value, supplies)
        }
        return value
    }

    const get =
        this._caching ?
            this._caching.cacher(
                factoryRunner,
                buildCacheKey({ ...this, _caching: this._caching }, registry)
            )
        :   once(factoryRunner)

    const supplier = {
        tm: this.tm,
        get,
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

function buildCacheKey(
    module: UnknownModule & { _caching: CachingConfig<unknown> },
    registry: RegistryRecord
) {
    const moduleId = (module: UnknownModule) => {
        return [module.tm, module._mockId, module._version]
            .filter((part) => part !== undefined)
            .join(".")
    }

    const parts = module._team
        .map((member) => {
            const registration = registry[member.tm]
            if (!registration) return undefined

            if (typeof registration === "function") {
                if (isModule(member)) return moduleId(member)
                return undefined
            }

            if (isModule(registration.service)) {
                return `${moduleId(registration.service)}:${module._caching.serializer(registration.get())}`
            }

            return `${member.tm}:${module._caching.serializer(registration.get())}`
        })
        .filter((part) => part !== undefined)

    return [moduleId(module), ...parts].join("_")
}

import type {
    ModuleSupplier,
    UnknownService,
    Supplier,
    UnknownModule
} from "#types/public"
import type { MarketRecord, RegistryRecord } from "#types/records"
import { isSpecified, isModule, isModuleSupplier, once } from "#utils"
import { assertPlainObject } from "#validation"

export function call<THIS extends UnknownModule>(
    this: THIS,
    specified: THIS["_toSpecifyType"]
) {
    assertPlainObject("specified", specified)

    // Stores the known supplies that can be preserved to optimize reassemble
    const preserved: MarketRecord<UnknownService> = {}

    for (const [name, supplier] of Object.entries(this._caller?.market ?? {})) {
        // Do not preserve supplies from newly hired
        // or newly specified
        if (this._hired.some((hname) => hname === name) || name in specified) {
            continue
        }

        // Do not preserve if some of the services's team members
        // depend on newly hired or specified (except service not from factory
        // which are preserved if not directly overwritten by specified)
        if (
            supplier &&
            isModuleSupplier(supplier) &&
            !isSpecified(supplier) &&
            supplier.service._team.some(
                (s: UnknownService) =>
                    s.tm in specified ||
                    this._hired.some((hname) => hname === s.tm)
            )
        ) {
            continue
        }

        preserved[name] = supplier
    }

    const definedSpecified: MarketRecord<UnknownService> = Object.fromEntries(
        Object.entries(specified).filter(
            (entry): entry is [string, Supplier<UnknownService>] =>
                entry[1] !== undefined
        )
    )

    const registry: RegistryRecord = {
        ...preserved,
        ...definedSpecified
    }

    for (const service of this._team) {
        if (!isModule(service) || service.tm in registry) continue
        registry[service.tm] = once(() => service._resolve(registry))
    }

    const supplier = this._resolve(registry)
    warmup(supplier)

    return supplier
}

function warmup(supplier: ModuleSupplier<UnknownModule>) {
    // Warmup service factories in the background (non-blocking)
    for (const member of supplier.service._team) {
        // If warmup fails, we don't want to break the entire supply chain
        // The error will be thrown again when the dependency is actually needed
        Promise.resolve()
            .then(() => supplier.supplies[member.tm])
            .catch(() => {
                // Silently catch errors during warmup
                // The error will be thrown again when the dependency is actually accessed
            })
    }

    Promise.resolve()
        .then(() => supplier.get())
        .catch(() => {
            // Silently catch errors during warmup
            // The error will be thrown again when the dependency is actually accessed
        })
}

export function provision<THIS extends UnknownModule>(this: THIS) {
    const supplier = call.call(this, {})
    return {
        ...this,
        _caller: {
            ...supplier,
            market: { ...supplier.market, [this.tm]: supplier }
        }
    }
}

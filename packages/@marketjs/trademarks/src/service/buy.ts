import type {
    ServiceSupply,
    UnknownTM,
    Supply,
    UnknownService
} from "#types/public"
import type { ResolvedRecord, SuppliesRecord } from "#types/records"
import { isFromFactory, isService, isServiceSupply, once } from "#utils"
import { assertPlainObject } from "#validation"

export function buy<THIS extends UnknownService>(
    this: THIS,
    specified: THIS["_toSpecify"]
) {
    assertPlainObject("specified", specified)

    // Stores the known supplies that can be preserved to optimize reassemble
    const preserved: ResolvedRecord<UnknownTM> = {}

    for (const [name, supply] of Object.entries(this._known)) {
        // Do not preserve supplies from newly hired
        // or newly specified
        if (this._hired.some((hname) => hname === name) || name in specified) {
            continue
        }

        // Do not preserve if some of the services's team members
        // depend on newly hired or specified (except service not from factory
        // which are preserved if not directly overwritten by specified)
        if (
            supply &&
            isServiceSupply(supply) &&
            isFromFactory(supply) &&
            supply.tm._team.some(
                (t: UnknownTM) =>
                    t.name in specified ||
                    this._hired.some((hname) => hname === t.name)
            )
        ) {
            continue
        }

        preserved[name] = supply
    }

    const definedSpecified: ResolvedRecord<UnknownTM> = Object.fromEntries(
        Object.entries(specified).filter(
            (entry): entry is [string, Supply<UnknownTM>] =>
                entry[1] !== undefined
        )
    )

    const market: SuppliesRecord = { ...preserved, ...definedSpecified }

    for (const tm of this._team) {
        if (!isService(tm) || tm.name in market) continue
        market[tm.name] = once(() => tm._build(market))
    }

    const supply = this._build(market)
    warmup(supply)

    return supply
}

function warmup(supply: ServiceSupply<UnknownService>) {
    // Warmup service factories in the background (non-blocking)
    for (const member of supply.tm._team) {
        // If warmup fails, we don't want to break the entire supply chain
        // The error will be thrown again when the dependency is actually needed
        Promise.resolve()
            .then(() => supply.deps[member.name])
            .catch(() => {
                // Silently catch errors during warmup
                // The error will be thrown again when the dependency is actually accessed
            })
    }

    Promise.resolve()
        .then(() => supply.unpack())
        .catch(() => {
            // Silently catch errors during warmup
            // The error will be thrown again when the dependency is actually accessed
        })
}

export function provision<THIS extends UnknownService>(this: THIS) {
    const supply = buy.call(this, {})
    return { ...this, _known: { ...supply.market, [this.name]: supply } }
}

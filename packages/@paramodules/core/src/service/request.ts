import type {
    ModuleSupplier,
    UnknownService,
    Supplier,
    UnknownModule
} from "#types/public"
import type { MarketRecord, RegistryRecord } from "#types/records"
import { wasRequested, isModule, isModuleSupplier, once } from "#utils"
import { assertPlainObject } from "#validation"

export function request<THIS extends UnknownModule>(
    this: THIS,
    req: THIS["_reqType"]
) {
    assertPlainObject("request", req)

    // Stores the known suppliers that can be preserved to optimize nested requests
    const preserved: MarketRecord<UnknownService> = {}

    for (const [name, supplier] of Object.entries(this._caller?.market ?? {})) {
        // Do not preserve supplies from newly hired
        // or newly specified
        if (this._hired.some((hname) => hname === name) || name in req) {
            continue
        }

        // Do not preserve if some of the services's team members
        // depend on newly hired or specified (except service not from factory
        // which are preserved if not directly overwritten by specified)
        if (
            supplier &&
            isModuleSupplier(supplier) &&
            !wasRequested(supplier) &&
            supplier.service._team.some(
                (s: UnknownService) =>
                    s.tm in req || this._hired.some((hname) => hname === s.tm)
            )
        ) {
            continue
        }

        preserved[name] = supplier
    }

    const definedRequested: MarketRecord<UnknownService> = Object.fromEntries(
        Object.entries(req).filter(
            (entry): entry is [string, Supplier<UnknownService>] =>
                entry[1] !== undefined
        )
    )

    const registry: RegistryRecord = {
        ...preserved,
        ...definedRequested
    }

    for (const service of this._team) {
        if (service.tm in registry) continue
        if (!isModule(service)) {
            registry[service.tm] = service.of(service._init)
        }
    }

    for (const service of this._team) {
        if (service.tm in registry) continue
        if (isModule(service)) {
            registry[service.tm] = createModuleSupplierLoader(service, registry)
        }
    }

    const supplier = createModuleSupplierLoader(this, registry)()
    warmup(supplier)

    return supplier
}

function createModuleSupplierLoader(
    service: UnknownModule,
    registry: RegistryRecord
) {
    const resolve = () => service._resolve(registry)
    if (service._memo) {
        return service._memo(resolve, buildCacheKey(service, registry))
    }
    return once(resolve)
}

function buildCacheKey(service: UnknownModule, registry: RegistryRecord) {
    const modules = [
        service,
        ...service._team.filter(
            (member): member is UnknownModule =>
                isModule(member) && member._memo !== undefined
        )
    ]
        .map((module) => `${module.tm}.${module._version}`)
        .join("")

    const values = service._team
        .filter((member) => shouldIncludeValueInCacheKey(member, registry))
        .map((member) =>
            serializeCacheKeyPart(member, readSupplyValue(member, registry))
        )

    return [modules, ...values].join("_")
}

function shouldIncludeValueInCacheKey(
    service: UnknownService,
    registry: RegistryRecord
) {
    const registration = registry[service.tm]
    if (!registration || typeof registration === "function") {
        return false
    }
    return !isModule(service) || wasRequested(registration)
}

function readSupplyValue(service: UnknownService, registry: RegistryRecord) {
    const registration = registry[service.tm]
    if (!registration || typeof registration === "function") {
        return undefined
    }
    return registration.get()
}

function serializeCacheKeyPart(service: UnknownService, value: unknown): string {
    return stableStringify(value, service.tm, new WeakSet())
}

function stableStringify(
    value: unknown,
    serviceName: string,
    seen: WeakSet<object>
): string {
    if (value === undefined) {
        return "undefined"
    }
    if (
        value === null ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        typeof value === "string"
    ) {
        if (typeof value === "number" && !Number.isFinite(value)) {
            throwMemoKeyError(serviceName)
        }
        return JSON.stringify(value)
    }
    if (
        typeof value === "bigint" ||
        typeof value === "symbol" ||
        typeof value === "function"
    ) {
        throwMemoKeyError(serviceName)
    }
    if (seen.has(value)) {
        throwMemoKeyError(serviceName)
    }
    seen.add(value)

    if (Array.isArray(value)) {
        const serialized = `[${value
            .map((item) => stableStringify(item, serviceName, seen))
            .join(",")}]`
        seen.delete(value)
        return serialized
    }

    if (value instanceof Date) {
        seen.delete(value)
        return JSON.stringify(value.toJSON())
    }

    if (!isPlainObject(value)) {
        throwMemoKeyError(serviceName)
    }

    const object = value as Record<string, unknown>
    const serialized = `{${Object.keys(object)
        .sort()
        .map(
            (key) =>
                `${key}:${stableStringify(object[key], serviceName, seen)}`
        )
        .join(",")}}`
    seen.delete(value)
    return serialized
}

function isPlainObject(value: object) {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function throwMemoKeyError(serviceName: string): never {
    throw new TypeError(
        `Cannot build memo cache key for requested service "${serviceName}": values passed with .of(...) must be serializable when memo is enabled.`
    )
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
    const supplier = request.call(this, {})
    return {
        ...this,
        _caller: {
            ...supplier,
            market: { ...supplier.market, [this.tm]: supplier }
        }
    }
}

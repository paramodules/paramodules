import type {
    CachingConfig,
    RegistryRecord,
    UnknownModule
} from "#types/public"
import { isModule } from "#utils"
import { assertCachingConfig } from "#validation"

/**
 * Enables cross-request caching for a module after its TYPE has been inferred.
 *
 * @param config - Cacher and serializer for cache keys
 * @returns The same module with caching enabled
 * @public
 */
export function caching<THIS extends UnknownModule>(
    this: THIS,
    config: CachingConfig<THIS["_type"]>
): THIS {
    assertCachingConfig(this.tm, config)
    return { ...this, _caching: config }
}

export function buildCacheKey(
    module: UnknownModule & { _caching: CachingConfig<unknown> },
    registry: RegistryRecord
) {
    const moduleId = (module: UnknownModule) => {
        return [
            module.tm,
            module._implementId,
            module._version
        ]
            .filter((part) => part !== undefined)
            .join(".")
    }

    const parts = module._team
        .map((member) => {
            const registration = registry[member.tm]
            if (!registration) return undefined

            const supplier =
                typeof registration === "function" ?
                    registration()
                :   registration

            if (isModule(supplier.service)) return moduleId(supplier.service)

            if (typeof registration === "function") return undefined

            return `${member.tm}:${module._caching.serializer(supplier.get())}`
        })
        .filter((part) => part !== undefined)

    return [moduleId(module), ...parts].join("_")
}

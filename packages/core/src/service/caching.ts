import type { CachingConfig, UnknownModule } from "#types/public"
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

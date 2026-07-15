import type { ResourceCacher } from "paramodules"
import { cachified, CachifiedOptions } from "@epic-web/cachified"

export function create(
    options: Omit<CachifiedOptions<unknown>, "key" | "getFreshValue">
): ResourceCacher {
    return <TYPE extends Promise<unknown>>(
        factoryRunner: () => TYPE,
        cacheKey: string
    ) => {
        return () => {
            return cachified({
                ...options,
                key: cacheKey,
                getFreshValue: factoryRunner
            }) as TYPE
        }
    }
}

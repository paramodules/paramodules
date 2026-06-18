import {
    apiCacheNamespace,
    $postsPromise,
    $usersPromise
} from "@/api"
import {
    clearPersistentCache,
    getPersistentCacheEntries,
    subscribePersistentCache
} from "@/cache-display"
import { service } from "@paramodules/react"
import { useEffect, useState } from "react"

export const $CacheStatus = service("CacheStatus").module({
    factory: () =>
        function CacheStatus() {
            const [entries, setEntries] = useState(() =>
                getPersistentCacheEntries(apiCacheNamespace)
            )

            useEffect(() => {
                const refresh = () =>
                    setEntries(getPersistentCacheEntries(apiCacheNamespace))

                refresh()
                return subscribePersistentCache(refresh)
            }, [])

            const clearCache = () => {
                clearPersistentCache(apiCacheNamespace)
                $usersPromise.invalidate()
                $postsPromise.invalidate()
                window.location.reload()
            }

            return (
                <aside className="mb-6 rounded-lg border border-cyan-500/50 bg-cyan-950/40 p-4 text-sm text-cyan-100">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="font-semibold text-cyan-200">
                                v0.14 memo cache demo
                            </h2>
                            <p className="mt-1 text-cyan-100/80">
                                The user and feed modules use{" "}
                                <code>memo:</code> with a localStorage-backed
                                wrapper. First load waits on the mock API delay;
                                refreshes reuse the paramodules cache key and
                                skip it.
                            </p>
                            <p className="mt-2 text-xs text-cyan-100/70">
                                Cached entries: {entries.length}
                            </p>
                        </div>
                        <button
                            onClick={clearCache}
                            className="rounded bg-cyan-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-cyan-500"
                        >
                            Invalidate cache and reload
                        </button>
                    </div>
                </aside>
            )
        }
})

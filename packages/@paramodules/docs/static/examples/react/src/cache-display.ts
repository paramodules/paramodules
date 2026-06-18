const CACHE_EVENT = "paramodules-example-cache"

export type PersistentCacheEntry = {
    key: string
    savedAt: string
}

type StoredValue = {
    savedAt: string
    value: unknown
}

export function getPersistentCacheEntries(
    namespace: string
): PersistentCacheEntry[] {
    const prefix = getCachePrefix(namespace)

    return Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .map((key) => {
            const stored = parseStoredValue(localStorage.getItem(key))
            return {
                key: key.slice(prefix.length),
                savedAt: stored?.savedAt ?? "unknown"
            }
        })
        .sort((a, b) => a.key.localeCompare(b.key))
}

export function clearPersistentCache(namespace: string) {
    const prefix = getCachePrefix(namespace)

    Object.keys(localStorage)
        .filter((key) => key.startsWith(prefix))
        .forEach((key) => localStorage.removeItem(key))

    notifyPersistentCacheChanged()
}

export function subscribePersistentCache(listener: () => void) {
    window.addEventListener(CACHE_EVENT, listener)
    window.addEventListener("storage", listener)

    return () => {
        window.removeEventListener(CACHE_EVENT, listener)
        window.removeEventListener("storage", listener)
    }
}

export function notifyPersistentCacheChanged() {
    window.dispatchEvent(new Event(CACHE_EVENT))
}

function getCachePrefix(namespace: string) {
    return `paramodules:${namespace}:`
}

function parseStoredValue(raw: string | null): StoredValue | undefined {
    if (!raw) {
        return undefined
    }

    try {
        return JSON.parse(raw) as StoredValue
    } catch {
        return undefined
    }
}

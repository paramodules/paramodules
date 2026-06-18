import {
    createSerializableValueMemo,
    type JsonValue
} from "paramodules"
import { notifyPersistentCacheChanged } from "@/cache-display"

type StoredValue = {
    savedAt: string
    value: JsonValue
}

export function localStorageMemo(namespace: string) {
    const prefix = `paramodules:${namespace}:`

    return createSerializableValueMemo({
        name: "localStorageMemo",
        readStorage: (cacheKey) => readStorage(`${prefix}${cacheKey}`),
        writeStorage(cacheKey, value) {
            writeStorage(`${prefix}${cacheKey}`, value)
        }
    })
}

function readStorage(storageKey: string) {
    const stored = parseStoredValue(localStorage.getItem(storageKey))

    if (!stored) {
        return undefined
    }

    return Promise.resolve(stored.value)
}

function writeStorage(storageKey: string, value: JsonValue) {
    localStorage.setItem(
        storageKey,
        JSON.stringify({
            savedAt: new Date().toISOString(),
            value
        })
    )

    notifyPersistentCacheChanged()
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


import { Cacheable } from "cacheable"
import memoizePackage from "memoize"
import type { Memo } from "#types/internal"

const cacheableStore = new Cacheable()
const memoizeStore = new Map()

export type JsonValue =
    | null
    | string
    | number
    | boolean
    | JsonValue[]
    | { [key: string]: JsonValue }

export type ValueMemoStorage<VALUE = unknown> = {
    readStorage: (
        cacheKey: string
    ) => VALUE | undefined | PromiseLike<VALUE | undefined>
    writeStorage: (
        cacheKey: string,
        value: VALUE
    ) => unknown | PromiseLike<unknown>
    validateValue?: (
        cacheKey: string,
        value: unknown
    ) => asserts value is VALUE
}

export type SerializableValueMemoStorage = Omit<
    ValueMemoStorage<JsonValue>,
    "validateValue"
> & {
    name?: string
}

export const memoize: Memo = (fn, cacheKey) =>
    memoizePackage(fn, { cache: memoizeStore, cacheKey: () => cacheKey })

export const cacheable: Memo = createValueMemo({
    readStorage: (cacheKey) => cacheableStore.get(cacheKey),
    writeStorage: (cacheKey, value) => cacheableStore.set(cacheKey, value)
})

export function createSerializableValueMemo({
    name = "serializableValueMemo",
    readStorage,
    writeStorage
}: SerializableValueMemoStorage): Memo {
    return createValueMemo({
        readStorage,
        writeStorage,
        validateValue(cacheKey, value): asserts value is JsonValue {
            assertJsonValue(name, cacheKey, value, "value", new WeakSet())
        }
    })
}

export function createValueMemo<VALUE = unknown>({
    readStorage,
    writeStorage,
    validateValue
}: ValueMemoStorage<VALUE>): Memo {
    return (fn, cacheKey) =>
        (function (
            this: ThisParameterType<typeof fn>,
            ...args: Parameters<typeof fn>
        ) {
            const supplier = fn.apply(this, args)

            if (!isGettable(supplier)) {
                return supplier
            }

            let hasResult = false
            let result: unknown

            return {
                ...supplier,
                get(...getArgs: unknown[]) {
                    if (!hasResult) {
                        hasResult = true
                        result = readOrPersistValue(
                            cacheKey,
                            () => supplier.get.apply(supplier, getArgs),
                            readStorage,
                            writeStorage,
                            validateValue
                        )
                    }
                    return result
                }
            }
        }) as typeof fn
}

function readOrPersistValue<VALUE>(
    cacheKey: string,
    getValue: () => unknown,
    readStorage: ValueMemoStorage<VALUE>["readStorage"],
    writeStorage: ValueMemoStorage<VALUE>["writeStorage"],
    validateValue: ValueMemoStorage<VALUE>["validateValue"]
) {
    const storedValue = readStorage(cacheKey)

    if (isPromiseLike(storedValue)) {
        return storedValue.then((value) => {
            if (value !== undefined) {
                return value
            }
            return persistValue(cacheKey, getValue(), writeStorage, validateValue)
        })
    }

    if (storedValue !== undefined) {
        return storedValue
    }

    return persistValue(cacheKey, getValue(), writeStorage, validateValue)
}

function persistValue<VALUE>(
    cacheKey: string,
    value: unknown,
    writeStorage: ValueMemoStorage<VALUE>["writeStorage"],
    validateValue: ValueMemoStorage<VALUE>["validateValue"]
) {
    if (isPromiseLike(value)) {
        return value.then((resolvedValue) =>
            writeValue(cacheKey, resolvedValue, writeStorage, validateValue)
        )
    }

    return writeValue(cacheKey, value, writeStorage, validateValue)
}

function writeValue<VALUE>(
    cacheKey: string,
    value: unknown,
    writeStorage: ValueMemoStorage<VALUE>["writeStorage"],
    validateValue: ValueMemoStorage<VALUE>["validateValue"]
) {
    validateValue?.(cacheKey, value)
    const writeResult = writeStorage(cacheKey, value as VALUE)

    if (isPromiseLike(writeResult)) {
        return writeResult.then(() => value)
    }

    return value
}

function assertJsonValue(
    name: string,
    cacheKey: string,
    value: unknown,
    path: string,
    seen: WeakSet<object>
): asserts value is JsonValue {
    if (
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean"
    ) {
        return
    }

    if (typeof value === "number") {
        if (Number.isFinite(value)) {
            return
        }
        throwSerializableMemoError(name, cacheKey, path)
    }

    if (typeof value !== "object") {
        throwSerializableMemoError(name, cacheKey, path)
    }

    if (seen.has(value)) {
        throwSerializableMemoError(name, cacheKey, path)
    }
    seen.add(value)

    if (Array.isArray(value)) {
        value.forEach((item, index) =>
            assertJsonValue(name, cacheKey, item, `${path}[${index}]`, seen)
        )
        seen.delete(value)
        return
    }

    if (!isPlainObject(value)) {
        throwSerializableMemoError(name, cacheKey, path)
    }

    Object.entries(value).forEach(([key, item]) =>
        assertJsonValue(name, cacheKey, item, `${path}.${key}`, seen)
    )
    seen.delete(value)
}

function throwSerializableMemoError(
    name: string,
    cacheKey: string,
    path: string
): never {
    throw new TypeError(
        `Cannot persist memo result for "${cacheKey}" at "${path}": ${name} can only store JSON-serializable module values.`
    )
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
    return (
        value !== null &&
        (typeof value === "object" || typeof value === "function") &&
        "then" in value &&
        typeof value.then === "function"
    )
}

function isPlainObject(value: object) {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

function isGettable(value: unknown): value is {
    get: (...args: unknown[]) => unknown
} {
    return (
        value !== null &&
        typeof value === "object" &&
        "get" in value &&
        typeof value.get === "function"
    )
}

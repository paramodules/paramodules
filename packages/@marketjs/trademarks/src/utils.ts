import type {
    ServiceSupply,
    UnknownTM,
    Supply,
    UnknownService
} from "#types/public"

/**
 * Minimal once implementation for memoizing function results.
 * Caches both successful results and errors, ensuring the wrapped function
 * executes only once and subsequent calls return/throw the cached value.
 *
 * @typeParam T - The function type to wrap
 * @param func - The function to execute only once
 * @returns A memoized version of the function that caches both results and errors
 * @internal
 */
export function once<F extends (...args: any[]) => any>(func: F): F {
    let called = false
    let result: ReturnType<F>
    let error: Error | undefined

    return function (this: ThisType<F>, ...args: Parameters<F>) {
        if (!called) {
            called = true
            try {
                result = func.apply(this, args)
            } catch (e) {
                error = e as Error
                throw e
            }
        }
        if (error) {
            throw error
        }
        return result
    } as F
}

export function dedupe(services: UnknownTM[]) {
    const deduped: Record<string, UnknownTM> = {}
    for (const service of services) {
        deduped[service.name] = service
    }
    return Object.values(deduped)
}

/**
 * Transforms an array of supplies into a map keyed by service names.
 * This provides type-safe access to assembled supplies by their service names.
 *
 * @typeParam LIST - An array type where each element has a `service` property with a `name`
 * @param list - Array of supplies to index
 * @returns A map where keys are service names and values are the supplies
 * @public
 */
export function index<LIST extends { tm: { name: string } }[]>(...list: LIST) {
    return list.reduce(
        (acc, r) => ({ ...acc, [r.tm.name]: r }),
        {}
    ) as MapFromList<LIST>
}

/**
 * Converts an array of objects with name properties into a map where keys are the names.
 * This is used internally to create lookup maps from service arrays for type-safe access.
 *
 * @typeParam LIST - An array of objects that have a `name` property
 * @returns A map type where each key is a name from the list and values are the corresponding objects
 * @public
 */
export type MapFromList<LIST extends { tm: { name: string } }[]> =
    LIST extends [] ? Record<string, never>
    :   UnionToIntersection<
            {
                [K in keyof LIST]: {
                    [NAME in LIST[K]["tm"]["name"]]: LIST[K]
                }
            }[number]
        >

/**
 * @param ms - Number of milliseconds to wait
 * @returns A promise that resolves after the delay with undefined
 * @internal
 */
export function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Type guard to check if a service is an app service.
 * @param service - The service to check
 * @returns True if the service is an app service, false if it's a request service
 * @internal
 */
export function isService<SERVICE extends UnknownService>(
    service: SERVICE | UnknownTM
): service is SERVICE {
    return "_service" in service && service._service === true
}

export function isServiceSupply<SUPPLY extends Supply<UnknownTM>>(
    supply: SUPPLY
): supply is Extract<SUPPLY, ServiceSupply<UnknownService>> {
    return isService(supply.tm)
}

export function isFromFactory(supply: Supply<UnknownTM>) {
    return "_fromFactory" in supply && supply._fromFactory === true
}

/**
 * Merges a union type into a single intersection type.
 * This utility type is used internally to combine multiple types into one cohesive type.
 * @typeParam U - The union type to merge
 * @returns An intersection type that combines all members of the union
 * @public
 */

export type UnionToIntersection<U> =
    (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I
    :   never

export type Merge<T, U> = [U] extends [never] ? T : Omit<T, keyof U> & U

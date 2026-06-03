import type {
    ModuleSupplier,
    UnknownService,
    Supplier,
    UnknownModule
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

export function dedupe(services: UnknownService[]) {
    const deduped: Record<string, UnknownService> = {}
    for (const service of services) {
        deduped[service.tm] = service
    }
    return Object.values(deduped)
}

/**
 * Transforms an array of suppliers into a map keyed by service trademarks.
 * This provides type-safe access to suppliers by their service trademarks.
 *
 * @typeParam LIST - An array type where each element has a `service` property with a `tm`
 * @param list - Array of suppliers to index
 * @returns A map where keys are service trademarks and values are their suppliers
 * @public
 */
export function index<LIST extends { service: { tm: string } }[]>(
    ...list: LIST
) {
    return list.reduce(
        (acc, r) => ({ ...acc, [r.service.tm]: r }),
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
export type MapFromList<LIST extends { service: { tm: string } }[]> =
    LIST extends [] ? Record<string, never>
    :   UnionToIntersection<
            {
                [K in keyof LIST]: {
                    [NAME in LIST[K]["service"]["tm"]]: LIST[K]
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
 * Type guard to check if a service is amodule.
 * @param service - The service to check
 * @returns True if the service is an app service, false if it's a request service
 * @internal
 */
export function isModule<MODULE extends UnknownModule>(
    service: MODULE | UnknownService
): service is MODULE {
    return "_module" in service && service._module === true
}

export function isModuleSupplier<SUPPLIER extends Supplier<UnknownService>>(
    supplier: SUPPLIER
): supplier is Extract<SUPPLIER, ModuleSupplier<UnknownModule>> {
    return isModule(supplier.service)
}

export function isSpecified(supplier: Supplier<UnknownService>) {
    return "_specified" in supplier && supplier._specified === true
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

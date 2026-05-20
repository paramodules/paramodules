import type { UnknownService, UnknownTM } from "#types/public"

type FindDuplicateName<
    SERVICES extends UnknownTM[],
    SEEN extends string[] = []
> =
    any[] extends SERVICES ? never
    : SERVICES extends (
        [infer FIRST extends UnknownTM, ...infer REST extends UnknownTM[]]
    ) ?
        string extends FIRST["name"] ? never
        : FIRST["name"] extends SEEN[number] ? FIRST["name"]
        : FindDuplicateName<REST, [...SEEN, FIRST["name"]]>
    :   never

export interface DuplicateDependencyError {
    ERROR: "Duplicate dependency name detected"
}

export type DuplicateDependencyGuard<
    SERVICE extends UnknownTM,
    SERVICES extends UnknownTM[]
> =
    [FindDuplicateName<SERVICES>] extends [never] ? SERVICE
    :   DuplicateDependencyError

/**
 * Checks if a service has a circular dependency by seeing if its name appears
 * in the transitive dependencies of its own services.
 * @public
 */

export type CircularDependencyGuard<SERVICE extends UnknownService> =
    string extends SERVICE["name"] ? SERVICE
    : string extends keyof SERVICE["_toSpecify"] ? SERVICE
    : SERVICE["name"] extends (
        keyof Omit<SERVICE["_toSpecify"], keyof SERVICE["_known"]>
    ) ?
        CircularDependencyError
    :   SERVICE

export type CircularDependencyError = {
    ERROR: "Circular dependency detected"
}

export type ServiceGuard<
    SERVICE extends UnknownService,
    SERVICES extends UnknownTM[]
> =
    DuplicateDependencyGuard<SERVICE, SERVICES> extends (
        DuplicateDependencyError
    ) ?
        DuplicateDependencyError
    :   CircularDependencyGuard<SERVICE>

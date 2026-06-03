import type { UnknownModule, UnknownService } from "#types/public"

type FindDuplicateTrademark<
    SERVICES extends UnknownService[],
    SEEN extends string[] = []
> =
    any[] extends SERVICES ? never
    : SERVICES extends (
        [
            infer FIRST extends UnknownService,
            ...infer REST extends UnknownService[]
        ]
    ) ?
        string extends FIRST["tm"] ? never
        : FIRST["tm"] extends SEEN[number] ? FIRST["tm"]
        : FindDuplicateTrademark<REST, [...SEEN, FIRST["tm"]]>
    :   never

export interface DuplicateServiceError {
    ERROR: "Duplicate service trademark detected"
}

export type DuplicateServiceGuard<
    SERVICE extends UnknownService,
    SERVICES extends UnknownService[]
> =
    [FindDuplicateTrademark<SERVICES>] extends [never] ? SERVICE
    :   DuplicateServiceError

/**
 * Checks if a module has a circular dependency by seeing if its tm appears
 * in the transitive dependencies of its own modules.
 * @public
 */

type CallerProvidedKeys<MODULE extends UnknownModule> =
    NonNullable<MODULE["_caller"]> extends { market: infer MARKET } ?
        keyof MARKET
    :   never

export type CircularModuleGuard<MODULE extends UnknownModule> =
    string extends MODULE["tm"] ? MODULE
    : string extends keyof MODULE["_toSpecifyType"] ? MODULE
    : MODULE["tm"] extends (
        keyof Omit<MODULE["_toSpecifyType"], CallerProvidedKeys<MODULE>>
    ) ?
        CircularModuleError
    :   MODULE

export type CircularModuleError = {
    ERROR: "Circular dependency detected"
}

export type ModuleGuard<
    MODULE extends UnknownModule,
    SERVICES extends UnknownService[]
> =
    DuplicateServiceGuard<MODULE, SERVICES> extends DuplicateServiceError ?
        DuplicateServiceError
    :   CircularModuleGuard<MODULE>

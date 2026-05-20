/**
 * Runtime validation utilities for the trademarks package.
 * These validators help catch common errors for users who don't use TypeScript.
 * @internal
 */

import type { Spec, UnknownService, UnknownTM } from "#types/public"

/**
 * Validates that a value is a string.
 * @param name - The parameter name for error messages
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a string
 */
export function assertString(
    name: string,
    value: unknown
): asserts value is string {
    if (typeof value !== "string") {
        throw new TypeError(`${name} must be a string, got ${typeof value}`)
    }
}

/**
 * Validates that a value is a valid JavaScript identifier name
 * (suitable for use as a variable name or object property name).
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a valid identifier
 */
export function assertName(value: string) {
    // JavaScript identifier must start with letter, underscore, or dollar sign
    // and can contain letters, digits, underscores, and dollar signs
    const identifierPattern = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/

    if (value === "") {
        throw new TypeError(`name must not be empty`)
    }

    if (!identifierPattern.test(value)) {
        throw new TypeError(
            `${value} contains invalid characters for a JavaScript identifier, or doesn't start with a letter, underscore, or dollar sign`
        )
    }
}
/**
 * Validates that a value is a plain object (not null, array, or other special object).
 * @param name - The parameter name for error messages
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a plain object
 */
export function assertPlainObject(
    name: string,
    value: unknown
): asserts value is object {
    if (value === null || typeof value !== "object") {
        throw new TypeError(
            `${name} must be an object, got ${
                value === null ? "null" : typeof value
            }`
        )
    }
    if (Array.isArray(value)) {
        throw new TypeError(`${name} must be an object, not an array`)
    }
}

export function assertHasProperty<K extends string, V>(
    name: string,
    value: V,
    property: K
): asserts value is V & { [key in K]: unknown } {
    if (!Object.prototype.hasOwnProperty.call(value, property)) {
        throw new TypeError(`${name} must have a '${property}' property`)
    }
}

/**
 * Validates that a value is a function.
 * @param name - The parameter name for error messages
 * @param value - The value to validate
 * @internal
 * @throws TypeError if the value is not a function
 */
export function assertFunction(
    name: string,
    value: unknown
): asserts value is (...args: unknown[]) => unknown {
    if (typeof value !== "function") {
        throw new TypeError(`${name} must be a function, got ${typeof value}`)
    }
}

/**
 * Validates the plan object for services.
 * @param name - Service name, used in error messages
 * @param plan - The plan object to validate
 * @internal
 * @throws TypeError if the plan is invalid
 */
export function assertServicePlan(
    name: string,
    plan: {
        required?: unknown
        optionals?: unknown
        factory?: unknown
        warmup?: unknown
    }
) {
    assertPlainObject(name, plan)
    assertHasProperty(name, plan, "factory")
    if (plan.factory !== undefined) {
        assertFunction(name, plan.factory)
    }

    const required = plan.required ?? []
    const optionals = plan.optionals ?? []

    assertTMs(name, required)
    assertSpecs(name, optionals)

    if (plan.warmup !== undefined) {
        assertFunction(name, plan.warmup)
    }
}

export function assertSpec(tm: unknown): asserts tm is Spec {
    assertHasProperty("noname", tm, "name")
    assertString("noname", tm.name)

    assertHasProperty(tm.name, tm, "_spec")
    if (!tm._spec) {
        throw new TypeError(`${tm.name} is not a spec`)
    }
}

export function assertService(
    tm: unknown,
    allowMocks: boolean = false
): asserts tm is UnknownService {
    assertHasProperty("noname", tm, "name")
    assertString("noname", tm.name)
    assertHasProperty(tm.name, tm, "_service")
    assertHasProperty(tm.name, tm, "_mock")

    if (
        !allowMocks &&
        "_hired" in tm &&
        Array.isArray(tm._hired) &&
        tm._hired.length > 0
    ) {
        throw new TypeError(`Cannot depend on ${tm.name} service`)
    }

    if (!allowMocks && tm._mock) {
        throw new TypeError(`Cannot depend on ${tm.name} mock service`)
    }
}

/**
 * Validates that all items in an array are valid trademarks.
 * @param name - The parameter name for error messages
 * @param tms - The trademarks array to validate
 * @param allowMocks - Whether to allow mocks
 * @internal
 * @throws TypeError if any service is invalid
 */
export function assertTMs(
    name: string,
    tms: unknown,
    allowMocks: boolean = false
): asserts tms is UnknownTM[] {
    if (!Array.isArray(tms)) {
        throw new TypeError(`${name} must be an array`)
    }
    tms.forEach((tm) => {
        try {
            assertSpec(tm)
            return
        } catch (e) {
            assertService(tm, allowMocks)
        }
    })
}

export function assertSpecs(
    name: string,
    specs: unknown
): asserts specs is Spec[] {
    if (!Array.isArray(specs)) {
        throw new TypeError(`${name} must be an array`)
    }
    specs.forEach((spec) => {
        assertSpec(spec)
    })
}

export function assertServices(
    name: string,
    services: unknown,
    allowMocks: boolean = false
): asserts services is UnknownService[] {
    if (!Array.isArray(services)) {
        throw new TypeError(`${name} must be an array`)
    }
    services.forEach((service) => {
        assertService(service, allowMocks)
    })
}

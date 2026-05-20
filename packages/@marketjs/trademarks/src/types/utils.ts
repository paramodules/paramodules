import type { UnknownTM } from "#types/public"

type Id<T, CASE extends "self" | "name"> =
    CASE extends "name" ?
        T extends { name: infer N } ?
            N
        :   never
    :   T

export type MergeTuplesBy<
    CASE extends "self" | "name",
    OLD extends readonly unknown[],
    WITH extends readonly unknown[],
    ACC extends readonly unknown[] = []
> =
    any[] extends OLD | WITH ? [...OLD, ...WITH]
    : OLD extends [infer Head, ...infer Tail] ?
        Id<Head, CASE> extends Id<WITH[number], CASE> ?
            MergeTuplesBy<CASE, Tail, WITH, ACC>
        :   MergeTuplesBy<CASE, Tail, WITH, [...ACC, Head]>
    :   [...ACC, ...WITH]

/**
 * Merges two service arrays by filtering out OLD services that match NEW service names,
 * then appending NEW services. This ensures hired services override existing ones.
 * Used internally by the `hire` method to create the merged team.
 *
 * @typeParam OLD - The original array of services
 * @typeParam NEW - The array of new services to merge in (overriding matching names)
 * @returns A merged array with NEW services replacing matching OLD services
 * @public
 */
export type MergeServiceTuples<
    OLD extends UnknownTM[],
    WITH extends UnknownTM[]
> = MergeTuplesBy<"name", OLD, WITH>

export type MergeStringTuples<
    OLD extends readonly string[],
    WITH extends readonly string[]
> = MergeTuplesBy<"self", OLD, WITH>

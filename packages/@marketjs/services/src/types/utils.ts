import type { UnknownService } from "#types/public"

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

export type MergeStringTuples<
    OLD extends readonly string[],
    WITH extends readonly string[]
> = MergeTuplesBy<"self", OLD, WITH>

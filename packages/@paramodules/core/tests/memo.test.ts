import { describe, expect, it, vi } from "vitest"
import {
    cacheable,
    createSerializableValueMemo,
    index,
    service,
    type JsonValue
} from "#index"
import type { Memo } from "#types/public"

function localMemo(): Memo {
    const cache = new Map<string, unknown>()
    return ((fn, cacheKey) =>
        function (this: unknown, ...args: unknown[]) {
            if (!cache.has(cacheKey)) {
                cache.set(cacheKey, fn.apply(this, args))
            }
            return cache.get(cacheKey)
        }) as Memo
}

describe("Module memoization and invalidation", () => {
    it("uses module plan memo functions to cache suppliers across requests", () => {
        const $session = service("session").param<{ userId: string }>()
        const factory = vi.fn(({ session }) => `profile-${session.userId}`)

        const $profile = service("profile").module({
            required: [$session],
            memo: localMemo(),
            factory
        })

        expect(
            $profile.request(index($session.of({ userId: "ada" }))).get()
        ).toBe("profile-ada")
        expect(
            $profile.request(index($session.of({ userId: "ada" }))).get()
        ).toBe("profile-ada")
        expect(
            $profile.request(index($session.of({ userId: "grace" }))).get()
        ).toBe("profile-grace")

        expect(factory).toHaveBeenCalledTimes(2)
    })

    it("bumps module versions with invalidate and misses stale memo entries", () => {
        const $session = service("sessionInvalidate").param<string>()
        const factory = vi.fn(({ sessionInvalidate }) => sessionInvalidate)

        const $profile = service("profileInvalidate").module({
            required: [$session],
            memo: localMemo(),
            factory
        })

        $profile.request(index($session.of("ada"))).get()
        $profile.request(index($session.of("ada"))).get()
        expect(factory).toHaveBeenCalledTimes(1)

        $profile.invalidate()

        expect($profile._version).toBe(1)
        $profile.request(index($session.of("ada"))).get()
        expect(factory).toHaveBeenCalledTimes(2)
    })

    it("throws when invalidating modules without memo enabled", () => {
        const $profile = service("profileNoMemo").module({
            factory: () => "profile"
        })

        expect(() => $profile.invalidate()).toThrow(
            'Cannot invalidate "profileNoMemo" because invalidate() only applies to memo-enabled modules.'
        )
        expect($profile._version).toBe(0)
    })

    it("includes transitive dependency versions in memo cache keys", () => {
        const leafFactory = vi.fn(() => "leaf")
        const parentFactory = vi.fn(({ memoLeaf }) => `parent-${memoLeaf}`)

        const $leaf = service("memoLeaf").module({
            memo: localMemo(),
            factory: leafFactory
        })

        const $parent = service("memoParent").module({
            required: [$leaf],
            memo: localMemo(),
            factory: parentFactory
        })

        expect($parent.request({}).get()).toBe("parent-leaf")
        expect($parent.request({}).get()).toBe("parent-leaf")
        expect(parentFactory).toHaveBeenCalledTimes(1)

        $leaf.invalidate()

        expect($parent.request({}).get()).toBe("parent-leaf")
        expect(leafFactory).toHaveBeenCalledTimes(2)
        expect(parentFactory).toHaveBeenCalledTimes(2)
    })

    it("only includes memo-enabled module dependency versions in memo cache keys", () => {
        const keys: string[] = []
        const memo: Memo = ((fn, cacheKey) => {
            keys.push(cacheKey)
            return fn
        }) as Memo

        const $plainLeaf = service("plainLeaf").module({
            factory: () => "plain"
        })
        const $memoLeaf = service("keyedLeaf").module({
            memo,
            factory: () => "memo"
        })
        const $parent = service("keyedParent").module({
            required: [$plainLeaf, $memoLeaf],
            memo,
            factory: ({ plainLeaf, keyedLeaf }) => `${plainLeaf}-${keyedLeaf}`
        })

        expect($parent.request({}).get()).toBe("plain-memo")

        expect(keys).toContain("keyedParent.0keyedLeaf.0")
        expect(keys).not.toContain("keyedParent.0plainLeaf.0keyedLeaf.0")
    })

    it("passes constructed cache keys to memo wrappers", () => {
        const keys: string[] = []
        const memo: Memo = ((fn, cacheKey) => {
            keys.push(cacheKey)
            return fn
        }) as Memo

        const $session = service("sessionKey").param<{
            userId: string
            orgId: string
        }>()
        const $profile = service("profileKey").module({
            required: [$session],
            memo,
            factory: ({ sessionKey }) => sessionKey.userId
        })
        const $dashboard = service("dashboardKey").module({
            required: [$profile],
            memo,
            factory: ({ profileKey }) => profileKey
        })

        expect(
            $dashboard
                .request(index($session.of({ orgId: "acme", userId: "ada" })))
                .get()
        ).toBe("ada")

        expect(keys).toContain(
            'dashboardKey.0profileKey.0_{orgId:"acme",userId:"ada"}'
        )
        expect(keys).toContain('profileKey.0_{orgId:"acme",userId:"ada"}')
    })

    it("throws for unserializable requested values when memo is enabled", () => {
        const $callback = service("callback").param<() => string>()
        const $usesCallback = service("usesCallback").module({
            required: [$callback],
            memo: localMemo(),
            factory: ({ callback }) => callback()
        })

        expect(() =>
            $usesCallback.request(index($callback.of(() => "value")))
        ).toThrow(
            'Cannot build memo cache key for requested service "callback"'
        )
    })

    it("throws for unserializable requested module overrides when memo is enabled", () => {
        const $resource = service("resourceOverride").module({
            factory: () => new Map([["key", "factory"]])
        })
        const $consumer = service("resourceConsumer").module({
            required: [$resource],
            memo: localMemo(),
            factory: ({ resourceOverride }) => resourceOverride
        })

        expect(() =>
            $consumer.request(
                index($resource.of(new Map([["key", "requested"]])))
            )
        ).toThrow(
            'Cannot build memo cache key for requested service "resourceOverride"'
        )
    })

    it("allows unserializable requested values when memo is not enabled", () => {
        const $callback = service("callbackNoMemo").param<() => string>()
        const $usesCallback = service("usesCallbackNoMemo").module({
            required: [$callback],
            factory: ({ callbackNoMemo }) => callbackNoMemo()
        })

        expect(
            $usesCallback.request(index($callback.of(() => "value"))).get()
        ).toBe("value")
    })

    it("provides a cacheable helper for async module plans", async () => {
        const $session = service("sessionAsync").param<string>()
        const factory = vi.fn(async ({ sessionAsync }) => `async-${sessionAsync}`)

        const $asyncProfile = service("asyncProfile").module({
            required: [$session],
            memo: cacheable,
            factory
        })

        await expect(
            $asyncProfile.request(index($session.of("ada"))).get()
        ).resolves.toBe("async-ada")
        await expect(
            $asyncProfile.request(index($session.of("ada"))).get()
        ).resolves.toBe("async-ada")

        expect(factory).toHaveBeenCalledTimes(1)
    })

    it("provides a serializable value memo builder for external storage", async () => {
        const storage = new Map<string, JsonValue>()
        const externalMemo = createSerializableValueMemo({
            readStorage: (cacheKey) => storage.get(cacheKey),
            writeStorage: (cacheKey, value) => storage.set(cacheKey, value)
        })
        const factory = vi.fn(async () => ({ name: "Ada" }))
        const $profile = service("externalProfile").module({
            memo: externalMemo,
            factory
        })

        await expect(Promise.resolve($profile.request({}).get())).resolves.toEqual(
            {
                name: "Ada"
            }
        )
        await expect(Promise.resolve($profile.request({}).get())).resolves.toEqual(
            {
                name: "Ada"
            }
        )

        expect(factory).toHaveBeenCalledTimes(1)
        expect(storage.get("externalProfile.0")).toEqual({ name: "Ada" })
    })

    it("serializable value memo rejects non-json module values", async () => {
        const externalMemo = createSerializableValueMemo({
            readStorage: () => undefined,
            writeStorage: () => undefined
        })
        const $profile = service("externalFunctionProfile").module({
            memo: externalMemo,
            factory: async () => ({ load: () => "Ada" })
        })

        await expect($profile.request({}).get()).rejects.toThrow(
            'Cannot persist memo result for "externalFunctionProfile.0" at "value.load"'
        )
    })
})

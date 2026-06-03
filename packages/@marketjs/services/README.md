# @marketjs/trademarks

**Stateless primitive for full-stack Typescript application architecture, inspired by signals.**

Trademark your values, functions, and features. Let the market wire your dependency graph — fully type-inferred, with no decorators, no containers, no global state, no magic.

```ts
const $session = tm("session").spec<{ userId: string }>()

const $greet = tm("greet").service({
    required: [$session],
    factory: ({ session }) => `Hello, ${session.userId}!`
})

const message = $greet.buy({ session: $session.of({ userId: "ada" }) }).unpack()
// → "Hello, ada!"
```

That's the whole library.

---

## Why trademarks? 🤔

- 🧩 **One primitive, infinite architectures** — `tm()` is a typed identity for a value. Use it for env vars, sessions, repositories, UI components, business logic, side effects, promises — anything.
- 🔒 **Fully type-safe and type-inferred** — TypeScript follows your graph end to end. If a spec is missing, the compiler tells you exactly which one.
- 🧊 **Stateless, immutable, async-safe** — Context flows without a container, registry, or `AsyncLocalStorage`. Each `buy()` is its own isolated universe. Works as a drop-in replacement for React Context too.
- ⚡ **Zero framework coupling** — Server components, client components, edge handlers, microservices, scripts. Anywhere TypeScript runs.
- 🪶 **Tiny** — ~5 KB minified, ~2 KB minzipped. Fully tree-shakable.
- 🚫 **Refreshingly un-OOP** — No classes, no decorators, no `reflect-metadata`. Just functions and inference.
- 📡 **Signals-inspired** — Trademarks are like signals where values flow via dependency-injection instead of global state. All the composability, with async-safety built in.

---

## Install

```bash
npm install @marketjs/trademarks
```

---

## When to reach for trademarks 🎯

- You're tired of prop-drilling or React Context in your Next.js app or server components
- You want SOLID, code-splittable architecture without an OOP framework
- You need painless mocking and A/B testing of any piece of your app
- You're building microservices or backend handlers that share context across deep call stacks
- You want a single mental model for both your front-end and back-end code

---

## The market metaphor 🏪

Think of your app as a marketplace where independent, decoupled services organize in supply chains to produce complex objects.

| In the market…                   | In trademarks…                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Register a trademark             | `tm(name)` — declare a typed identity                                                                  |
| Trademark a service              | `.service({ factory })` — a computed value built from other specs and services                         |
| Specify what the client wants    | `.spec<T>()` — a typed slot for a value the caller provides at request time                            |
| Stamp a value with the trademark | `.of(value)` — mark a concrete value as an instance of this trademark                                  |
| Place an order                   | `.buy(specs)` — provide the required specs and build the service                                       |
| Open the package                 | `.unpack()` — get the underlying value back out                                                        |
| Stock the shelves ahead of time  | `.provision()` — pre-build everything that doesn't depend on request-time specs                        |
| Bring in alternative suppliers   | `.mock()` + `.hire()` — swap implementations without touching call sites                               |
| The shelves themselves           | `market` — the dictionary of currently resolved trademarked values available to the whole service tree |

---

## Compared to signals 📡

If you've used signals before, trademarks will feel immediately familiar. The shapes map almost one-to-one:

```ts
// Signals
const session = signal.state<{ userId: string }>({ userId: "ada" })
const greet = signal.computed(() => `Hello, ${session.value.userId}!`)

// Trademarks
const $session = tm("session").spec<{ userId: string }>()
const $greet = tm("greet").service({
    required: [$session],
    factory: ({ session }) => `Hello, ${session.userId}!`
})
```

`signal.state` → `tm().spec()` — a typed slot for a source value.  
`signal.computed` → `tm().service()` — a value derived from other trademarks.

**The key difference is how values flow.** Signals keep a mutable, module-scoped graph: you write to a source with `.set()`, and computeds re-run automatically. Trademarks keep the graph **stateless**: you stamp values at the edge with `.of()`, then `.buy()` builds one immutable snapshot for that request. Nothing lives in global state, and nothing re-runs until you buy again.

That trade-off is the point. Signals excel at UIs that change over time. Trademarks excel at server handlers, jobs, React Server Components, and microservices — anywhere you want the same composable dependency graph, but with **explicit, request-scoped wiring** instead of reactive ambient state.

You trade implicit auto-tracking for something you already write every day: an explicit dependency list that reads like a function signature—and costs about as much to declare.

---

## A worked example 🛠️

Let's build a small to-do feature, step by step. Each piece in this guide continues from the last.

### Step 1 — Declare your specs

A **spec** is a trademark without a factory. It represents anything your app _receives_ from the outside world: request sessions, env vars, third-party SDKs, the current time.

```ts
import { tm, index } from "@marketjs/trademarks"

// Any data coming from the caller — just declare the type
const $session = tm("session").spec<{ userId: string }>()
```

You're not providing a value yet. A spec is a _typed slot_ — a promise that something will fill it in by the time the graph is built.

### Step 2 — Declare your services

A **service** is a trademark with a factory. It declares which specs and services it depends on, then produces a value from them.

```ts
// A service with no dependencies — self-contained
const $todos = tm("todos").service({
    factory: () => new Map<string, string[]>()
})

// A service that depends on both a spec and another service
const $addTodo = tm("addTodo").service({
    required: [$session, $todos],
    factory:
        ({ session, todos }) =>
        (todo: string) => {
            const current = todos.get(session.userId) ?? []
            todos.set(session.userId, [...current, todo])
            return todos.get(session.userId)
        }
})
```

The factory receives a `deps` object whose keys are the trademark names of its `required` list. TypeScript infers all of this — no manual type annotations needed.

### Step 3 — Provision what you can

Some parts of your graph don't depend on the current request at all. Call `.provision()` on your **root service** — the entry point of your app — to pre-build everything that can be cached and reused across requests. Everything that _does_ depend on a spec (like `$session`) is left alone and filled in at request time.

```ts
const $addTodo = tm("addTodo").service({
    required: [$session, $todos],
    factory:
        ({ session, todos }) =>
        (todo: string) => {
            const current = todos.get(session.userId) ?? []
            todos.set(session.userId, [...current, todo])
            return todos.get(session.userId)
        }
})

const $logger = tm("logger").service({
    factory: () => (message: string) => console.log(`[app] ${message}`)
})

// The root of the graph — owns the whole feature set
const $app = tm("app")
    .service({
        required: [$addTodo, $logger],
        factory: ({ addTodo, logger }) => ({
            addTodo: (todo: string) => {
                const todos = addTodo(todo)
                logger(`todo added: "${todo}"`)
                return todos
            }
        })
    })
    .provision()
// ↑ $todos and $logger are built once and cached here.
//   $session is left open — it'll be filled in per request.

// At the edge, only the open specs need to be provided
server.onRequest((req) => {
    const app = $app.buy(index($session.of({ userId: req.userId }))).unpack()
    return app.addTodo(req.todo)
})
```

Don't provision() on a leaf like `$addTodo` or `$todos`, as it is wasteful for services on which you don't call .buy() or ctx().buy() on.

### Step 4 — Buy at the edge

At your app's entry point — an HTTP handler, a server action, a page component — provide your specifications and call `.buy()`. TypeScript will tell you exactly which specs are missing.

```ts
server.onRequest((req) => {
    const addTodo = $addTodo
        .buy(index($session.of({ userId: req.userId })))
        .unpack()

    return addTodo(req.todo)
})
```

`index(...)` is a small helper that takes a list of supplies and keys them by trademark name, so TypeScript can match them against the required spec list. That's the whole request cycle.

---

## Factory lifecycle ♻️

Each factory runs **at most once** per `.buy()` call. Trademarks builds the graph lazily and in parallel where it can, memoizing every result for that buy.

If you need to call something multiple times, return a function from the factory:

```ts
const $findUser = tm("findUser").service({
    required: [$db],
    factory: ({ db }) => {
        const cache = new Map() // ← runs once per buy
        return (id: string) => {
            // ← runs every time you call the returned fn
            if (cache.has(id)) return cache.get(id)
            const user = db.findUser(id)
            cache.set(id, user)
            return user
        }
    }
})
```

### Eager, lazy, and warmed 🌡️

Three patterns for tuning when expensive work actually happens:

```ts
// Eager — starts as soon as the graph is built, in parallel with other factories
const $eager = tm("eager").service({
    required: [$db],
    factory: ({ db }) => buildExpensive(db)
})

// Lazy — defers the work until someone calls the returned function
const $lazy = tm("lazy").service({
    required: [$db],
    factory: ({ db }) => once(() => buildExpensive(db))
})

// Warmed — lazy in shape, eager at the entry point.
// Lets you flip between the two without refactoring call sites.
const $warm = tm("warm").service({
    required: [$db],
    factory: ({ db }) => once(() => buildExpensive(db)),
    warmup: (build) => build()
})
```

---

## Optionals 🔌

When a service can _use_ a dependency if it's available but doesn't strictly require it, put it in `optionals`. Optional values are typed as `T | undefined` and don't need to be supplied in `buy()`.

```ts
const $api = tm("api").service({
    required: [$config],
    optionals: [$userAuth], // ← present when logged in, absent otherwise
    factory: ({ config, userAuth }) => ({
        url: config.url,
        token: userAuth?.token ?? null
    })
})
```

Great for feature flags, optional auth context, caching layers, and anything else that's "nice to have."

---

## Context propagation 🔭

Inside any factory, you receive a `ctx` argument as its second parameter. Use `ctx($tm).buy(...)` to rebuild part of the graph with different specs immutably — without leaving your factory, without globals, and without losing type safety.

A realistic example: an admin endpoint that fetches _another_ user's profile by temporarily swapping the `$session` spec, without duplicating any of the profile-fetching logic.

```ts
const $session = tm("session").spec<{ userId: string }>()
const $db = tm("db").spec<Database>()

const $userProfile = tm("userProfile").service({
    required: [$session, $db],
    factory: ({ session, db }) => db.profiles.findById(session.userId)
})

const $impersonate = tm("impersonate").service({
    required: [$session, $db],
    factory: ({ session, db }, ctx) => {
        // Only admins may impersonate
        const admin = db.users.findById(session.userId)
        if (!admin.isAdmin) throw new Error("Forbidden")

        // Rebuild $userProfile with the target user's session
        // IMPORTANT: Do not add $userProfile to required [] if you only use it for ctx(), just inject it via closure from the module scope.
        return (targetUserId: string) =>
            ctx($userProfile)
                .buy(index($session.of({ userId: targetUserId })))
                .unpack()
        // $db is reused from the outer buy — only $session is swapped
    }
})

// At the edge
server.onRequest((req) => {
    const impersonate = $impersonate
        .buy(index($session.of({ userId: req.userId }), $db.of(database)))
        .unpack()

    return impersonate(req.targetUserId)
})
```

`$userProfile`'s factory is called once with the _target_ session. Everything else — the database connection, any other shared services — is reused from the outer buy. No globals, no prop-drilling, no duplicated fetching logic.

---

## Testing, mocking & A/B testing 🧪

### Stub a value directly with `.of()`

The fastest way to replace a service in a test is to stamp a concrete value onto it, bypassing its factory entirely. But note: the specs that service normally requires must still be provided, because the dependency tree hasn't changed — TypeScript just won't call the factory.

```ts
// In production, $user fetches from the database using $session and $db
const $user = tm("user").service({
    required: [$session, $db],
    factory: ({ session, db }) => db.users.findById(session.userId)
})

const $profile = tm("profile").service({
    required: [$user],
    factory: ({ user }) => ({ displayName: user.name, joined: user.createdAt })
})

// In tests, bypass $user's factory with a hardcoded value —
// but $session must still be provided since it is a spec and it is still in the tree
const profile = $profile
    .buy(
        index(
            $user.of({ name: "Alice", createdAt: new Date("2024-01-01") }),
            $session.of({ userId: "alice-123" })
        )
    )
    .unpack()
```

If supplying all those specs is too much ceremony for a test, reach for `.mock()` + `.hire()` instead — they let you shrink the tree's requirements entirely.

### Swap implementations with `.mock()` + `.hire()`

For richer mocks — ones with their own dependency shapes, or that _shrink_ what `buy()` needs — define a `.mock(...)` and bring it in with `.hire(...)`:

```ts
// A mock $user that needs nothing from the caller
const $userMock = $user.mock({
    required: [],
    factory: () => ({ name: "Alice" })
})

// $session is no longer required — the tree shrank
const profile = $profile.hire($userMock).buy({}).unpack()
```

The same primitives power A/B testing, sandboxing, feature flags, and runtime behavior swaps — anywhere you want to swap an implementation without rewriting call sites.

---

## How it works under the hood 🔩

When you call `.buy({})`, trademarks builds a single self-referential, lazily evaluated flat object:

```ts
const market = {
    specA, // specs are placed in directly
    specB,

    // services wrap themselves in once() and pull from the same market
    serviceA: once(() => $serviceA._build(market)),
    serviceB: once(() => $serviceB._build(market))
}
```

Because everything lives in the same object, TypeScript can statically follow types across the whole graph. Because everything is memoized, each factory runs exactly once per buy. Because the object is local, there's no global state — every `buy()` is its own little universe.

That's the whole trick.

---

## Full API reference 📖

### `tm(name)` — declare a trademark

```ts
const $session = tm("session")
```

The entry point for everything. Names follow JS identifier rules — letters, digits, `_`, `$`; no leading digit. The `$` prefix on variables is just convention.

---

### `.spec<T>()` — a typed slot for an external value

```ts
const $session = tm("session").spec<{ userId: string }>()
const $db = tm("db").spec<Database>()
const $env = tm("env").spec<{ apiKey: string }>()
```

Represents anything your app receives from the outside world: sessions, env vars, request bodies, third-party SDKs. No factory — the caller is responsible for providing a value at buy time.

---

### `.service({ required?, optionals?, factory, warmup? })` — a computed value

```ts
const $user = tm("user").service({
    required: [$session, $db],
    optionals: [$logger],
    factory: ({ session, db, logger }) => {
        const user = db.users.findById(session.userId)
        logger?.(`fetched user ${user.id}`)
        return user
    }
})
```

Declares a value your app produces from other trademarks. `required` dependencies are typed as `T`; `optionals` are typed as `T | undefined` and don't need to be supplied in `buy()`.

The `warmup` option lets you eagerly invoke a lazy factory.

```ts
const $cache = tm("cache").service({
    factory: () => once(() => buildCache()),
    warmup: (build) => build() // called at buy() time (or provision() time if provisionned and spec-independent)
})
```

---

### `.of(value)` — stamp a concrete value

```ts
const supply = $session.of({ userId: "ada" })
```

Works on both specs and services. On a spec, it provides the value. On a service, it bypasses the factory entirely. Any specs the service normally required must still be provided in `buy()`, since they remain in the dependency tree.

---

### `.buy(specs)` — build the graph for one request

```ts
const $app = tm("app").service({ required: [$session, $db], factory: ... })

const supply = $app.buy(index(
    $session.of({ userId: "ada" }),
    $db.of(database)
))
```

Accepts a keyed map of supplies (use `index(...)` to build it). Returns a supply. TypeScript will error if any required spec is missing. Each factory in the graph runs at most once per `buy()` call.

---

### `.provision()` — pre-build the request-independent parts

```ts
const $app = tm("app")
    .service({ required: [$session, $db], factory: ... })
    .provision()
```

Greedily builds everything in the graph that doesn't depend on a spec, and caches it forever. Call it on your root service for maximum effect. At request time, only the open specs need to be provided.

---

### `.mock({ required?, optionals?, factory, warmup? })` — define an alternative implementation

```ts
const $userMock = $user.mock({
    required: [],
    factory: () => ({ name: "Alice", createdAt: new Date("2024-01-01") })
})
```

Defines a drop-in replacement for a service with a different factory and (optionally) a different dependency shape. Use `.hire()` to activate it.

---

### `.hire(...mocks)` — swap implementations into the graph

```ts
const profile = $profile.hire($userMock).buy({}).unpack()
```

Returns a new service with the given mocks merged into its dependency tree. Because `$userMock` declares no dependencies, `$session` and `$db` are no longer required — the tree shrinks. Call sites are unchanged.

---

### `supply.unpack()` — get the value out

```ts
const user = $user
    .buy(index($session.of({ userId: "ada" }), $db.of(database)))
    .unpack()
```

Resolves and returns the underlying value. If the factory is async, `unpack()` returns a promise.

---

### `supply.deps` — the resolved dependency values

```ts
const supply = $user.buy(
    index($session.of({ userId: "ada" }), $db.of(database))
)
supply.deps // → { session: { userId: "ada" }, db: Database }
```

The fully resolved dependency map for this supply. Useful for debugging or passing resolved context to other tools.

---

### `supply.market` — the full supply dictionary

```ts
supply.market // → { session: Supply<Session>, db: Supply<Database>, user: Supply<User>, ... }
```

The complete keyed map of every supply in this buy, including transitive dependencies. Useful when you need to pass the whole resolved context somewhere.

---

### `index(...supplies)` — build a keyed map for `buy()`

```ts
$app.buy(index($session.of({ userId: "ada" }), $db.of(database)))
```

Sugar that takes a list of supplies and keys them by trademark name, producing the map that `buy()` expects. Without it you'd have to key them manually: `{ session: $session.of(...), db: $db.of(...) }`.

## Contributing

Issues and PRs welcome. 🙏

## License

MIT

# paramodules

**Stateless, parametrizable runtime modules — type-inferred primitives for cascading full-stack application architecture.**

Model the cascades in your app as a graph of small, decoupled, fully type-inferred modules. Stamp your inputs at the edge, and resolve the whole cascade as one immutable, request-scoped snapshot — no decorators, no containers, no global state, no magic.

```ts
import { service, index } from "@paramodules/core"

const $session = service("session").param<{ userId: string }>()

const $greet = service("greet").module({
    required: [$session],
    factory: ({ session }) => `Hello, ${session.userId}!`
})

const message = $greet.request(index($session.of({ userId: "ada" }))).get()
// → "Hello, ada!"
```

That's the whole library.

---

## The hard part of decoupling is the cascade 🌊

We all reach for the same goal: **decoupled code** — pieces you can read, test, and change in isolation. The standard move is to split the program into functions: clean inputs, clean outputs, no entanglement.

But functions don't stay decoupled, because real programs are full of **cascades** — a value or a change in one place that has to ripple through many others. A session flows into a scoped database, into a query, into a result, into a view. A write to one cache invalidates the caches derived from it. A state change re-renders everything downstream. The cascade couples your "independent" pieces whether you want it to or not. Two functions that look unrelated are secretly joined by the value that flows between them — or by the invalidation that must.

**This is why cache invalidation is the canonical hard problem.** Writing a cache is trivial. Invalidating one is brutal — the moment the underlying data changes, every cache that derived from it has to be invalidated too. That's a cascade tearing across caches that were each designed to be independent. The independence was the illusion; the cascade was the truth all along.

**UI frameworks are the largest case study in losing this fight.** They adopted the component model specifically to buy decoupling — components as isolated, composable units. But components are _not_ truly decoupled, because cascades run straight through them: shared state, derived values, data loading, re-render propagation. So the framework has to put the coupling back, and it does it with a pile of hidden runtime machinery — Context to smuggle a value past components that shouldn't have to know about it; caching and memo to stop the cascade from recomputing everything; preloading and loading waterfalls; Suspense to choreograph async cascades. Each of these exists to re-couple components that the component model pretended were separate, and each one costs you manual optimization to keep under control.

### Functions are the wrong unit of decoupling

Here's the claim. We keep picking the **function** as our unit of decoupling — and a function can't carry the cascade it lives in. It takes inputs and returns an output, but it has no idea what it depends on transitively, or what depends on it. So we always need something _outside_ the function to wire the cascade back together: a DI container, a framework runtime, a global store.

Traditional dependency injection makes this painfully literal — functions are the decoupled units, and a **container** is the external apparatus that couples them back together at runtime. That container is exactly where the hidden complexity collects: it's global, stateful, awkward to type, hard to test, and it's what makes "decoupled" code impossible to reason about locally.

### Modules are the right unit of decoupling

So what if the unit of decoupling carried its cascade _with it_?

That's what **modules** are: a function that holds its entire dependency stack. Not a function plus a container — a function that _is_ its own slice of the graph. It declares what it needs, and everything it transitively depends on travels with it. Hand a module to a test, to another module, or to the edge of your app, and it brings its whole cascade along. There's no container, because there's nothing left to couple — the coupling already lives inside the module.

Once the cascade lives inside the module, the hard parts dissolve into properties of the type:

- **The value cascade wires itself** — a deep module simply declares `$session`; no layer in between has to thread it through. (No prop-drilling, no Context.)
- **The type cascade is carried in the module's type** — change an input's shape and every dependent fails to compile. (Full inference, no annotations.)
- **The invalidation cascade is structural** — swap one input with `ctx()` and the module recomputes exactly its dependents and reuses the rest. (Cache invalidation, for free, from the shape of the graph.)
- **Isolation is the default** — nothing lives in a global container, so every resolution is its own immutable, request-scoped snapshot.

None of the _parts_ are new — dependency injection, memoization, and derived graphs all predate this. The idea is the **choice of primitive**: decouple at the level of the _module_ — the function-with-its-dependency-stack — instead of the bare function. Do that, and the cascade stops being something you bolt back on with a runtime, and becomes something you get for free.

The rest of this README is that idea, made concrete.

---

## Why paramodules? 🤔

- 🧩 **Modules, not functions, as the unit of decoupling** — a `service().module()` is a function that carries its whole dependency stack, so there's no container to wire it back together.
- 🔒 **Type inference cascades for you** — TypeScript follows the graph end to end. Change an upstream shape and every downstream factory updates; forget a required input and the compiler tells you.
- 🧊 **Stateless, immutable, request-scoped** — context flows without a container, registry, or `AsyncLocalStorage`. Each `request()` is its own universe.
- ⚡ **Zero framework coupling** — server components, edge handlers, microservices, scripts. Anywhere TypeScript runs.
- 🔁 **Memoized by construction** — diamond dependencies resolve once per request; swap one input and only the affected subtree recomputes.
- 🛡️ **Compile-time graph guards** — circular dependencies and duplicate trademarks surface as type errors before you run anything.
- 🚫 **Refreshingly un-OOP** — no classes, no decorators, no `reflect-metadata`. Just functions and inference.

---

## Install

```bash
npm install @paramodules/core
```

---

## Core vocabulary 🧱

| Term                  | What it is                                                                                    |
| --------------------- | --------------------------------------------------------------------------------------------- |
| `service(tm)`         | Declare a named, typed identity. `tm` is a trademark token uniquely identifying this service. |
| `.param<T>()`         | A typed slot for a value the caller provides at the edge — the source of a cascade.           |
| `.module({…})`        | A node in the cascade: a value derived from other params and modules via `factory`.           |
| `.of(value)`          | Stamp a concrete value onto a service — producing a **supplier**.                             |
| `.request(…)`         | Resolve the whole cascade for one set of inputs.                                              |
| `.get()`              | Read the value out of a supplier.                                                             |
| `.provision()`        | Pre-resolve every node that doesn't depend on a request-time param.                           |
| `.mock()` + `.hire()` | Reroute part of the cascade without touching call sites.                                      |
| `ctx(…)`              | From inside a factory, re-resolve part of the cascade with different inputs.                  |
| `index(…)`            | Key a list of suppliers by trademark, producing the map `request()` expects.                  |
| `supplies` / `market` | The resolved values / suppliers for every node in the cascade.                                |

---

## Cascades in practice

The same module primitive handles every kind of cascade. Here are the common ones.

### Type-inference cascades 🔠

Wire one module on top of another and the **types flow on their own**. Change a shape upstream and every downstream factory sees it immediately — no annotations, no re-plumbing.

```ts
const $tenant = service("tenant").param<{
    orgId: string
    plan: "free" | "pro"
}>()

const $limits = service("limits").module({
    required: [$tenant],
    factory: ({ tenant }) =>
        tenant.plan === "pro" ? { seats: 100 } : { seats: 3 }
})

const $billing = service("billing").module({
    required: [$tenant, $limits],
    // `tenant` and `limits` are both fully typed from the graph above
    factory: ({ tenant, limits }) => ({
        orgId: tenant.orgId,
        seats: limits.seats
    })
})
```

Add a field to `$tenant` and it appears in every factory that destructures `tenant`. Rename `plan` and the cascade lights up red at exactly the sites that still use the old name. The dependency list reads like a function signature, and inference cascades through the whole graph from it.

### Query-building cascades 🧮

Complex queries are cascades of small refinements: a base query, then a tenant filter, then an ownership filter, then a status filter. Each refinement is a decoupled module that narrows the one before it.

```ts
const $session = service("session").param<{ orgId: string; userId: string }>()
const $db = service("db").param<Database>()

const $visiblePosts = service("visiblePosts").module({
    required: [$session, $db],
    factory: ({ session, db }) =>
        db.select().from(posts).where(eq(posts.orgId, session.orgId))
})

const $myPosts = service("myPosts").module({
    required: [$session, $visiblePosts],
    factory: ({ session, visiblePosts }) =>
        visiblePosts.where(eq(posts.authorId, session.userId))
})

const $myDrafts = service("myDrafts").module({
    required: [$myPosts],
    factory: ({ myPosts }) => myPosts.where(eq(posts.status, "draft"))
})
```

Each stage is independently testable, and the tenant boundary declared at the root is guaranteed present in every leaf — you cannot build `$myDrafts` without `$visiblePosts`'s `orgId` filter cascading into it. This is exactly the multitenant scope pattern: a safe base scope that everything downstream is forced to compose from.

### Prop-drilling cascades, eliminated 🪜

The usual way a value reaches a deep consumer is by threading it through every layer in between. A module that needs `$session` just **declares it**, no matter how deep it sits — the layers above never have to accept-and-forward it.

```ts
// $session is needed all the way down here…
const $auditLog = service("auditLog").module({
    required: [$session, $db],
    factory:
        ({ session, db }) =>
        (action: string) =>
            db.audit.insert({ userId: session.userId, action })
})

// …but $report never mentions $session, even though it uses $auditLog
const $report = service("report").module({
    required: [$auditLog],
    factory:
        ({ auditLog }) =>
        () =>
            auditLog("generated-report")
})
```

`$report` doesn't know or care that `$auditLog` needs a session. The value cascades straight from the edge to the node that asked for it; intermediate nodes stay oblivious. The drilling disappears — this is the Context smuggling problem, solved by the module carrying its own stack.

### Loading waterfalls 💧

A loading waterfall is a cascade with async edges: load the user, then the user's org, then the org's settings. The dependency graph _is_ the waterfall — and because a factory only awaits the upstream values it actually uses, sequential steps serialize while independent branches resolve in parallel.

```ts
const $user = service("user").module({
    required: [$session, $db],
    factory: ({ session, db }) => db.users.findById(session.userId) // Promise<User>
})

const $org = service("org").module({
    required: [$user, $db],
    factory: async ({ user, db }) => db.orgs.findById((await user).orgId)
})

const $settings = service("settings").module({
    required: [$org, $db],
    factory: async ({ org, db }) => db.settings.findByOrg((await org).id)
})
```

`$settings` waits on `$org`, which waits on `$user` — a clean three-step waterfall expressed as data, not control flow. Any node that doesn't sit on that chain (a `$featureFlags` lookup, say) is kicked off alongside it rather than after it. Because `get()` returns a promise whenever a factory is async, the edge just `await`s the final node.

### Cache-invalidation cascades ♻️

This is the hard problem from the intro, handled structurally. Within one `request()`, every node is memoized — a value used by ten downstream modules is computed once (diamond dependencies just work). When you re-resolve part of the graph with a different input via `ctx()`, invalidation cascades precisely: anything that transitively depends on the changed input recomputes, and everything else is reused from the parent snapshot.

```ts
const $main = service("main").module({
    required: [$E], // $E depends on $A, $B(←$A), $C, $D(←$B)
    factory: ({ E }, ctx) => {
        // Swap $A. $B and $D depend on it (directly or transitively) → they recompute.
        // $C is independent → it is reused, not rebuilt.
        const next = ctx($E)
            .request(index($A.of(freshValue)))
            .get()

        next.A !== E.A // changed
        next.B !== E.B // recomputed (depends on A)
        next.C === E.C // reused (independent of A)
        next.D !== E.D // recomputed (depends on B)
        return next
    }
})
```

You get fine-grained invalidation for free, derived from the shape of the graph — no manual cache keys, no dependency arrays to keep in sync.

### UI mutation cascades 🎛️ _(forward-looking)_

UI frameworks already have cascade machinery: a state change at one node cascades down to re-render its consumers. The challenge is bridging a paramodules graph to a framework's own context propagation so that those mutation cascades line up with your dependency graph.

That's what the optional `context` field on a param/module is for. It stores an **opaque handle** — a React `Context` object, a Vue inject key, an `AsyncLocalStorage` instance — that core paramodules never interprets. An adapter reads it to connect a trademark to the framework's native context mechanism:

```ts
// The handle is stored verbatim for an adapter to consume later.
const $theme = service("theme").param<Theme>({ context: ThemeReactContext })
```

Core stays framework-agnostic; adapters use the `context` field to let UI mutations cascade through the host framework while the rest of your graph remains plain, testable paramodules. (Adapters live outside `@paramodules/core`.)

---

## Getting started 🛠️

Three concepts, in the order you'll use them.

**1. Params** are the sources of a cascade — values from the outside world. No factory.

```ts
const $session = service("session").param<{ userId: string }>()
```

**2. Modules** are the nodes — values derived from params and other modules.

```ts
const $todos = service("todos").module({
    factory: () => new Map<string, string[]>()
})

const $addTodo = service("addTodo").module({
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

The factory receives a `supplies` object whose keys are the trademark names of its `required` list — all inferred, no annotations.

**3. Provision once, request per call.** Call `.provision()` on your root module to pre-resolve everything that doesn't depend on a request-time param; supply the open params at the edge with `.request()`.

```ts
const $app = service("app")
    .module({
        required: [$addTodo],
        factory: ({ addTodo }) => ({ addTodo })
    })
    .provision()
// ↑ $todos is built once and cached. $session stays open.

server.onRequest((req) => {
    const app = $app.request(index($session.of({ userId: req.userId }))).get()
    return app.addTodo(req.todo)
})
```

`index(...)` keys a list of suppliers by trademark so TypeScript can match them against the required params. If any required param is missing, `.request()` is a compile error that names it.

> Don't `.provision()` a leaf you never call `.request()` on — it's wasted work. Provision the root.

---

## Reading values back out 📦

`.request()` returns a **supplier**. Beyond `.get()`, it exposes the whole resolved cascade:

```ts
const supplier = $app.request(index($session.of({ userId: "ada" })))

supplier.get() // → the module's value (a promise if the factory is async)
supplier.supplies // → { session: {...}, todos: Map, ... } — resolved values keyed by trademark
supplier.market // → { session: Supplier, todos: Supplier, ... } — the suppliers themselves
```

`supplies` gives unwrapped values; `market` gives the suppliers (call `.get()` on any of them). Both include transitive dependencies, fully typed.

---

## Factory lifecycle ♻️

Each factory runs **at most once** per `.request()`. The graph resolves lazily and memoizes every result, so a node shared by many downstream consumers is built a single time.

If you need to do work repeatedly, return a function from the factory:

```ts
const $findUser = service("findUser").module({
    required: [$db],
    factory: ({ db }) => {
        const cache = new Map() // ← runs once per request
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

Tune _when_ expensive work in a cascade happens:

```ts
import { once } from "@paramodules/core"

// Eager — kicked off when the cascade resolves, in parallel with sibling nodes
const $eager = service("eager").module({
    required: [$db],
    factory: ({ db }) => buildExpensive(db)
})

// Lazy — deferred until someone calls the returned function
const $lazy = service("lazy").module({
    required: [$db],
    factory: ({ db }) => once(() => buildExpensive(db))
})

// Warmed — lazy in shape, eager at the entry point.
// Flip between the two without changing call sites.
const $warm = service("warm").module({
    required: [$db],
    factory: ({ db }) => once(() => buildExpensive(db)),
    warmup: (build) => build()
})
```

`once(fn)` memoizes both the result and any thrown error, so the wrapped work runs exactly once. `warmup` receives the factory's return value (here, the lazy `build`) and is invoked right after the factory — at `request()` time, or at `provision()` time for param-independent nodes.

---

## Optionals 🔌

When a node can _use_ an input if it's available but doesn't strictly need it, put it in `optionals`. Optional values are typed `T | undefined` and don't have to be supplied to `request()`.

```ts
const $api = service("api").module({
    required: [$config],
    optionals: [$userAuth], // ← present when logged in, absent otherwise
    factory: ({ config, userAuth }) => ({
        url: config.url,
        token: userAuth?.token ?? null
    })
})
```

Ideal for feature flags, optional auth context, caching layers — anything "nice to have" that should still keep the cascade well-typed.

---

## Context propagation: `ctx` 🔭

Inside any factory you receive a `ctx` argument as the second parameter. `ctx($module).request(...)` re-resolves part of the cascade with different inputs — immutably, without leaving the factory, without globals, and without losing type safety. It's how a module reshapes its own dependency stack on the fly.

A realistic example: an admin endpoint fetching _another_ user's profile by temporarily swapping `$session`, with zero duplication of the profile logic.

```ts
const $session = service("session").param<{ userId: string }>()
const $db = service("db").param<Database>()

const $userProfile = service("userProfile").module({
    required: [$session, $db],
    factory: ({ session, db }) => db.profiles.findById(session.userId)
})

const $impersonate = service("impersonate").module({
    required: [$session, $db],
    factory: ({ session, db }, ctx) => {
        const admin = db.users.findById(session.userId)
        if (!admin.isAdmin) throw new Error("Forbidden")

        // Re-resolve $userProfile with the target user's session.
        // Reference $userProfile from module scope — no need to put it in required[].
        return (targetUserId: string) =>
            ctx($userProfile)
                .request(index($session.of({ userId: targetUserId })))
                .get()
        // $db is reused from the outer request — only $session changes.
    }
})
```

`$userProfile`'s factory runs once with the _target_ session; the database connection and every other shared node are reused from the outer snapshot. Worth knowing:

- `ctx($module).request(...)` never re-requires params already supplied upstream — you only pass what you want to change.
- Passing `undefined` for a key (`{ [$x.tm]: undefined }`) _erases_ an inherited supplier, forcing that subtree to rebuild from its own factory.
- `ctx($param)` on a param is a no-op — it returns the param.

---

## Testing, mocking & A/B testing 🧪

### Stub a value with `.of()`

Stamp a concrete value onto a module to bypass its factory. The params it normally required stay in the tree (the cascade shape is unchanged), so they must still be supplied — TypeScript just won't call the factory.

```ts
const $profile = $profileModule
    .request(
        index(
            $user.of({ name: "Alice", createdAt: new Date("2024-01-01") }),
            $session.of({ userId: "alice-123" }) // still required: it's still in the tree
        )
    )
    .get()
```

### Reroute a cascade with `.mock()` + `.hire()`

For richer replacements — ones with their own dependency shape, or that _shrink_ what `request()` needs — define a `.mock(...)` and bring it in with `.hire(...)`:

```ts
// A mock $user that needs nothing from the caller
const $userMock = $user.mock({
    required: [],
    factory: () => ({ name: "Alice" })
})

// $session is no longer required — the subtree under $user collapsed
const profile = $profile.hire($userMock).request({}).get()
```

`.hire(...)` takes multiple mocks and works inside factories too (`ctx($m).hire($mock).request(...)`). Same primitive for A/B testing, sandboxing, feature flags, and runtime swaps — the cascade reroutes, the call sites don't move.

---

## Compile-time safety nets 🛡️

Paramodules catches two classes of wiring mistakes as type errors, before runtime:

- **Circular dependencies** — if a node ends up depending on itself, directly or transitively (including through a mock), the result type widens to `CircularModuleError` and construction throws `"Circular dependency detected"`.
- **Duplicate trademarks** — if `.hire(...)` receives two mocks with the same trademark, the result widens to `DuplicateServiceError`.

```ts
import type {
    CircularModuleError,
    DuplicateServiceError
} from "@paramodules/core"
```

Missing or mistyped params in `request()` are ordinary type errors that name the exact trademark.

---

## How it works under the hood 🔩

When you call `.request({})`, paramodules builds a single self-referential, lazily evaluated flat object:

```ts
const registry = {
    paramA, // params are placed in directly
    paramB,

    // modules wrap themselves in once() and pull from the same market
    moduleA: once(() => $moduleA._resolve(registry)),
    moduleB: once(() => $moduleB._resolve(registry))
}
```

Because every node lives in the same object, TypeScript can statically follow types across the whole cascade. Because every node is memoized, each factory runs exactly once per request. Because the object is local, there's no global state — every `request()` is its own little universe. Newly resolved factories are kicked off in the background so eager work overlaps; errors are swallowed there and re-thrown on real access.

That's the whole trick. There is no container — the graph _is_ the value.

---

## API reference 📖

### `service(name)`

```ts
const $session = service("session")
```

The entry point. `name` follows JS identifier rules — letters, digits, `_`, `$`; no leading digit — and becomes the service's trademark (`tm`). The `$` prefix on variables is just convention. From here call `.param<T>()` or `.module({...})`.

### `.param<T>(opts?)`

```ts
const $session = service("session").param<{ userId: string }>()
```

A typed slot for an external value — the source of a cascade. No factory; the caller provides a value via `.of()`. The optional `{ context }` stores an opaque handle for framework adapters (see the UI mutation cascades section); core never interprets it.

### `.module({ required?, optionals?, factory, warmup?, context? })`

```ts
const $user = service("user").module({
    required: [$session, $db],
    optionals: [$logger],
    factory: ({ session, db, logger }) => db.users.findById(session.userId)
})
```

A cascade node. `required` deps are typed `T`; `optionals` are typed `T | undefined` and needn't be supplied. The factory receives `(supplies, ctx)`. `warmup(value, supplies)` eagerly invokes a lazy factory result.

### `.of(value)`

```ts
const supplier = $session.of({ userId: "ada" })
```

Stamp a concrete value onto a param (provides it) or a module (bypasses its factory). Returns a **supplier**. Params the module still lists in `required` remain in the tree and must be supplied to `request()`.

### `.request(supplies)`

```ts
const supplier = $app.request(
    index($session.of({ userId: "ada" }), $db.of(database))
)
```

Resolve the cascade for one input set. Takes a keyed map (build it with `index(...)`), returns a supplier, errors at compile time if a required param is missing. Each factory runs at most once.

### `.provision()`

```ts
const $app = service("app")
    .module({
        /* … */
    })
    .provision()
```

Greedily resolve everything in the graph that doesn't depend on a param, caching it forever. Call it on your root module; only open params remain to be supplied at request time.

### `.mock({ required?, optionals?, factory, warmup? })`

```ts
const $userMock = $user.mock({
    required: [],
    factory: () => ({ name: "Alice" })
})
```

A drop-in replacement for a module with a different factory and (optionally) a different dependency shape. A mock can't go in another module's `required` array — bring it in with `.hire()`.

### `.hire(...mocks)`

```ts
const profile = $profile.hire($userMock).request({}).get()
```

Return a new module with the mocks merged into its tree, collapsing any dependencies they removed. Call sites are unchanged. Two mocks sharing a trademark is a `DuplicateServiceError` at the type level.

### `supplier.get()`

```ts
const user = $user
    .request(index($session.of({ userId: "ada" }), $db.of(database)))
    .get()
```

Resolve and return the value. Returns a promise if the factory is async.

### `supplier.supplies`

```ts
supplier.supplies // → { session: { userId: "ada" }, db: Database, ... }
```

The resolved value of every node in the cascade, keyed by trademark (transitive deps included).

### `supplier.market`

```ts
supplier.market[$db.tm].get() // → Database
```

The supplier of every node, keyed by trademark — call `.get()` to read each lazily.

### `index(...suppliers)`

```ts
$app.request(index($session.of({ userId: "ada" }), $db.of(database)))
```

Key a list of suppliers by trademark, producing the map `request()` expects. Without it you'd key them by hand: `{ session: $session.of(...), db: $db.of(...) }`.

### `once(fn)` and `sleep(ms)`

```ts
import { once, sleep } from "@paramodules/core"
```

`once(fn)` returns a memoized `fn` that runs at most once, caching its result and any thrown error — the building block for lazy and warmed nodes. `sleep(ms)` resolves after `ms` milliseconds.

---

## Contributing

Issues and PRs welcome. 🙏

## License

MIT

---
title: "Performance Optimization"
description: "Learn about performance in typectx, including its small bundle size, memoization, and eager, lazy, and warmed factory patterns for optimal TypeScript dependency injection."
keywords:
    - performance
    - optimization
    - bundle size
    - lazy loading
    - eager loading
    - memoization
    - typescript
    - dependency injection
    - typectx
---

# Performance

typectx is designed for optimal performance, featuring a minimal bundle size, upfront service preparation, automatic lifecycle management, and factory patterns for eager, lazy, or pre-warmed work.

## Bundle Size & Footprint

- **~5KB minified, ~2KB minzipped**: Hyper-minimalistic bundle size. Most of the package is type definitions.
- **Zero dependencies**: Adds no external runtime dependencies to your project.
- **Tree-shakable and code-splittable architecture**: Helps you create hyper-specialized services: One function or piece of data per service.

## Factory Lifecycle & Memoization

Each factory runs at most once per assemble(), ctx().assemble() or preassemble() call for maximum performance.

Typectx eagerly preassembles your main service at startup and builds its dependency graph in parallel when possible. Dependencies that do not need request data are cached and ready for the first request. Dependencies that do need request data are resolved only after you assemble again with that data at request-time. When you do, Typectx recomputes only the parts of the graph that depend on the new request data, and reuses the rest.

### Automatic lifecycle management

Services that do not depend on request data are cached across requests. Otherwise, they are rebuilt on every request, or on nested request data changes.

In other words:

- Request-independent app services behave like long-lived cached singletons.
- App services with request dependencies behave like transient per-request scoped values.
- Nested `ctx(...).assemble(...)` calls only rebuild the services that the new request data invalidates.

```typescript
const $session = service("session").request<{ userId: string }>()

const $db = service("db").app({
    factory: () => connectDb()
})

const $currentUser = service("currentUser").app({
    services: [$db, $session],
    factory: ({ db, session }) => db.findUser(session.userId)
})

const $dashboard = service("dashboard")
    .app({
        services: [$db, $currentUser],
        factory: ({ db, currentUser }) => {
            return {
                user: currentUser,
                notifications: db.getNotifications(currentUser.id)
            }
        }
    })
    .preassemble()

export async function handleRequest(req: Request) {
    const session = await readSession(req)
    return $dashboard.assemble(index($session.pack(session))).unpack()
}

// On each request, only the request-dependent branch is rebuilt:
// - `db` can be preserved because it is request-independent.
// - `currentUser` is rebuilt because it depends on `session`.
// - `dashboard` is rebuilt because it depends on `currentUser`.
```

#### Eager, lazy, and warmed-up factories

1. **Eager factory** — This is the default as explained above. Factories run as soon as possible, in the background and in parallel, and are then cached for reuse.

```ts
const $eagerService = service("eagerService").app({
    services: [$db],
    factory: ({ db }) => buildExpensiveService(db)
})
```

2. **Lazy factory** — For factories that perform expensive or optional work, you can instead return a **memoized function** (a lodash like `once(() => ...)` utility is provided by typectx if you want) from the factory. The expensive work will only be performed the first time you actually call the inner function in some other service.

```ts
const $lazyService = service("lazyService").app({
    services: [$db],
    factory: ({ db }) =>
        once(() => {
            return buildExpensiveService(db)
        })
})
```

3. **Warmed-up factory** — For performance optimization and testing, sometimes you may need to often switch between eager or lazy factories. Refactoring this is a bit tedious as you'd need to update all use sites of a service from a property access to a function call. Instead, you can use the warmed-up factory pattern, which allows to switch easily from eager to lazy behavior without needing to refactor anything. You can also conditionally warmup the factory based on some flag.

```ts
const lazy = true
const $warmedService = service("warmedService").app({
    services: [$db],
    factory: ({ db }) => once(() => buildExpensiveService(db)),
    warmup: (lazyExpensiveService, { db }) => {
        if (lazy) return
        lazyExpensiveService()
    }
})
```

You can also use the warmup function for products that need to perform side-effects upon creation (like connecting to a database, logging, pre-warming caches, or running setup logic without cluttering the factory). `warmup` runs once immediately after the `factory` function returns, and receives the constructed product and deps as arguments.

For example, you can easily populate an external cache, or perform logging.

```typescript
import { once, service } from "typectx"

const cache = {}
const $profile = service("profile").app({
    services: [$session],
    factory: () => once((userId: string) => db.profiles.get(userId)),
    warmup: (getProfile, { session }) => {
        const profile = getProfile(session.user.id)
        cache[session.user.id] = profile
        console.log(`${session.useer.name}'s profile successfully loaded`)
    }
})
```

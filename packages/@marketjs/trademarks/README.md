# typectx

Fully type-inferred Context and Pure DI library for Typescript! Dependency injection (DI) and context propagation without reflect-metadata, decorators, annotations or compiler magic, just simple functions!

## Why typectx?

- ✅ **Scalable architecture** - Promotes SOLID, clean, and code-splittable design patterns.
- ✅ **Fully type-inferred** - Compile-time dependency validation.
- ✅ **Minimal boilerplate** - Trade-off: a bit more runtime boilerplate for much less type boilerplate.
- ✅ **Framework agnostic** - Accommodates all codebases where TypeScript works
- ✅ **No magic** - Just functions and closures, no classes, reflect-metadata, decorators, annotations or compiler magic.
- ✅ **Testing friendly** - Easy mocking and dependency swapping
- ✅ **Performance focused** - Smart memoization, lazy loading, code-splittable architecture.
- ✅ **Stateless** - Dependencies resolved via closures, not global state.
- ✅ **A new DI paradigm** - Don't let your past experiences with DI prevent you from trying this one!
- ✅ **Intuitive, opinionated terminology** - The supply chain metaphor helps DI finally make intuitive sense.

## Installation

```bash
npm install typectx
```

## When to Use typectx

- **Complex TypeScript applications** with deep function call hierarchies
- **Avoiding prop-drilling and waterfalls** in React (works in both Client and Server Components)
    - Full alternative to React Context.
- **Microservices** that need shared context propagation
- **Testing scenarios** requiring easy mocking and dependency swapping
- **A/B testing**, feature flagging and prototyping.
- **Any project** wanting DI without the complexity of traditional containers and OOP syntax

## Performance

- **Hyper-minimalistic bundle size**: ~5KB minified, ~2KB minzipped.
- **Tree-shakable and code-splittable architecture**: Helps you create hyper-specialized services: One function or piece of data per service
- **Memory usage**: Smart memoization prevents duplicate dependency resolution
- **Automatic lifecycle management**: App services are prepared immediately. Request-free services can pre-build at startup and be cached across requests; request-bound services rebuild when request data changes.
- **Options to optimize dependency chain waterfalls**: Choose an eager, lazy, or warmed-up factory pattern

## Quick Example

```ts
import { index, service } from "typectx"

// 1. Define request and app services
const $session = service("session").request<{ userId: string }>()
const $todosDb = service("todosDb").app({
    services: [],
    factory: () => new Map<string, string[]>() // Simple in-memory DB
})

// Define and preassemble your main service
const $addTodo = service("addTodo")
    .app({
        services: [$session, $todosDb],
        factory:
            ({ session, todosDb }) =>
            (todo: string) => {
                const userTodos = todosDb.get(session.userId) || []
                todosDb.set(session.userId, [...userTodos, todo])
                return todosDb.get(session.userId)
            }
    })
    .preassemble() // Will build and cache request-independent services, like $todosDb, across requests

const session = { userId: "user123" }

// 3. Assemble and use
server.onRequest((req) => {
    const addTodo = $addTodo
        .assemble(index($session.pack(req.session)))
        .unpack()

    console.log(addTodo("Learn typectx")) // ["Learn typectx"]
    console.log(addTodo("Build app")) // ["Learn typectx", "Build app"]

    return addTodo(req.todo)
})
```

## Intuitive, opinionated terminology

typectx uses an intuitive supply chain metaphor to make dependency injection easier to understand. You create fully-decoupled, hyper-specialized **services** that exchange **supplies** in a free-market fashion to assemble new, more complex products.

| Term                                                        | Classical DI Equivalent        | Description                                                                                                      |
| ----------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| **`service(name).request()` / `service(name).app(config)`** | `createContainer()+register()` | Declare services directly with explicit names and config.                                                        |
| **Service**                                                 | Service                        | Provides dependencies to other services. Node in your dependency graph.                                          |
| **Request Service**                                         | Value Service                  | Service for a value from the user's request (request params, cookies, etc.)                                      |
| **Input**                                                   | Value                          | Name for the value returned by a request service                                                                 |
| **App Service**                                             | Factory Service                | Service for a value computed by your app from other app or request services via a factory function               |
| **Product**                                                 | Value                          | Name for the value returned by an app service's factory                                                          |
| **Supply**                                                  | Proxy                          | Value wrapper (pack) for type-checking and transport across services                                             |
| **Supplies**                                                | Container / Context            | The collection of resolved dependencies, but still within their supply wrapper (pack).                           |
| **`assemble()`**                                            | `resolve()`                    | Gathers all required request supplies (app supplies are auto-wired) and injects them in app services' factories. |
| **Deps**                                                    | Values                         | The collection of resolved unpacked dependencies a factory receives                                              |

## Full features list

☀️ General

- Fully typesafe and type-inferred - Full TypeScript support with compile-time circular dependency detection.
- Fluent and expressive API - Learn in minutes, designed for both developers and AI usage.
- Fully framework-agnostic - Complements both back-end and front-end frameworks.

🔧 Dependency Injection

- Functions only - No classes, decorators, annotations, or compiler magic.
- Declarative, immutable, functionally pure.
- Stateless - Dependencies are resolved via closures, not state. Some memoized state is kept for validation and optimization purposes only.
- Auto-wired - All app services are built by the Supply Chain and resolve their dependencies automatically.
- Maximal colocation - All app services are registered right next to the factory that uses them, not at the entry point.

📦 Context Propagation

- Shared context - Assemble the context once at the entry point, access everywhere without prop-drilling.
- Smart memoization - Dependencies injected once per assemble() context for optimal performance.
- Context switching - Override context anywhere in the call stack with `ctx($service).assemble(...)`.
- Context enrichment - Add new inputs and products deep in the call stack with contextual assembly and `hire(...)`.

🧪 Testing and Packing

- You can override any service with `pack()`, which uses the provided value directly and overrides the request service's previous value or bypasses the service's factory.
- For more complex mocks which would benefit from a factory, see mock() below.

🚀 Mocking and A/B testing

- Use `mock()` to create alternative implementations of an app service, that may depend on different services than the original.
- Mock factories must return products of the same type as the original app service factory.
- Define mock or alternative services to `hire()` at the entry-point of your app
- For example, you can easily hire different versions of a UI component for A/B testing.

## Basic Usage

### 1. Define Request Services

Request services are used to wire the data you get from the user's request, like sessions or request params, that cannot be derived from other request or app services. You define a `$request` service and then `.pack()` it with a value at request time. The value can be anything you want, just specify its type.

Service names can **only** contain digits, letters, underscores or `$` signs and cannot start with a digit, just like any Javascript identifier.

```tsx
// I like calling services with $ prefix, but this is up to you.
const $session = service("session").request<{
    userId: string
}>()

const session = $session
    .pack({
        userId: "some-user-id"
    })
    .unpack()
```

### 2. Define App Services

App services are your application's components or features. They are factory functions that can depend on other app services or request data. Factories can return anything: simple values, promises or other functions.

Dependencies are accessed via the 1st argument of the factory (deps), destructured.

```tsx
const $user = service("user").app({
    services: [$session, $db], // Depends on session and db services.
    // properties of deps are the names provided to service("...").
    factory: ({ session, db }) => {
        return db.getUser(session.userId) // query the db to retrieve the user.
    }
})
```

### 3. Define Your Main service

Your Main service is just an app service like the other ones. It's the most complex app service at the very end of your supply chain. To prepare request-independent services and cache them for all requests, just call preassemble() on your main service, and let typectx optimize the entire dependency graph automatically:

```tsx
const $main = service("main")
    .app({
        services: [$user],
        factory: ({ user }) => {
            return <h1>Hello, {user.name}! </h1>
        }
    })
    .preassemble() //to preload all request-independent services across the entire dependency graph of the main service and cache the result across requests
```

### 4. Assemble at Entry Point

At your application's entry point, you `assemble` your $main service, providing just the request data requested recursively by the $main service's supply chain. Typescript will tell you if any request data is missing.

```tsx
server.onRequest((req) => {
    // Assemble the Main product, providing the Session and Db inputs.
    // Bad but working syntax for demonstration purposes only. See index() below for syntactic sugar.
    const main = $main
        .assemble({
            [$session.name]: $session.pack({
                userId: req.userId
            }),
            [$params.name]: params.pack(req.params)
        })
        .unpack()

    // Return or render main...
})
```

The flow of the assemble call is as follows: request data is obtained, which is provided to `$request` services using pack(). Then those inputs are supplied to `$main`'s services recursively, which assemble their own product, and pass them up along the supply chain until they reach `$main`, which assembles the final `main` product. All this work happens in the background, no matter the complexity of your application.

To simplify the assemble() call, you should use the index() utility, which just transforms an array like
`...[input1, product1]` into an indexed object like
`{[input1.name]: input1, [product1.name]: product1}`. I unfortunately did not find a way to merge index() with assemble() without losing assemble's type-safety, because typescript doesn't have an unordered tuple type.

```tsx
import { index } from "typectx"

server.onRequest((req) => {
    const main = $main
    .assemble(
        index(
            $session.pack({
                userId: req.userId
            }),
            $db.pack(db)
        )
    )
    .unpack().
})
```

## Factory Lifecycle & Memoization

Important: Each factory runs at most once per assemble(), ctx().assemble() or preassemble() call.

Typectx eagerly preassembles your main service at startup and builds its dependency graph in parallel when possible. Dependencies that do not need request data are cached and ready for the first request. Dependencies that do need request data are resolved only after you assemble again with that data. When you do, Typectx recomputes only the parts of the graph that depend on the new request data, and reuses the rest.

- **Need to control when something is called, to call something multiple times, or to run side-effects?** Return a function from your factory.

```ts
// ✅ Good: Returns a function for multiple calls or side-effects
const $createUser = service("createUser").app({
    services: [$db],
    factory: ({ db }) => {
        // This setup code runs only once per assemble()
        const cache = new Map()

        // Return a function that can be called multiple times
        return (userId: string) => {
            if (cache.has(userId)) return cache.get(userId)
            const user = db.findUser(userId)
            cache.set(userId, user)
            return user
        }
    }
})

const createUser = $createUser.assemble({}).unpack()

// Usage: createUser() can be called multiple times
const user1 = createUser("123") // Fresh call
const user2 = createUser("123") // Cached result
```

#### Eager, lazy, and warmed-up factory patterns

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

3. **Warmed-up factory** — For performance optimization and testing, sometimes you may need to often switch between eager or lazy factories. Refactoring this is a bit tedious as you'd need to update all use sites of a service from a property access to a method call, or vice-versa. Instead, you can use the warmed-up factory pattern, which allows to switch easily from eager to lazy behavior without needing to refactor anything. You can also conditionally warmup the factory based on some flag.

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

## Optionals

Sometimes a service can work with or without certain dependencies. For these cases, use the `optionals` parameter alongside `services`. Optional values may be `undefined` at runtime, and TypeScript will enforce proper undefined checks. You can also use optionals if a piece of request data is not yet known at the entry point of the application, so you don't want Typescript to enforce it being supplied in the assemble() call.

[Learn more about optionals →](https://typectx.github.io/typectx/docs/guides/optionals)

## Context Propagation

Context propagation is typectx's flagship capability. It lets you reassemble services deeper in the call stack by using `ctx($service).assemble(...)` with additional or overridden request supplies. This creates nested sub-contexts without global state and keeps dependency resolution type-safe end to end.

[Learn more about context propagation →](https://typectx.github.io/typectx/docs/guides/context-propagation)

## Testing and Packing

### 1. Mocking in tests with `.pack()`

You usually use `pack()` to provide request data to `assemble()` (see step 4 above), but you can also use `pack()` on app services. This allows to provide a value for that product directly, bypassing its factory. Perfect to override a product's implementation with a mock for testing.

```tsx
const $profile = service("profile").app({
    services: [$user],
    factory: ({ user }) => {
        return <h1>Profile of {user.name}</h1>
    }
})

const $user = service("user").app({
    services: [$db, $session],
    factory: ({db,session}) => {
        return db.findUserById(session.userId)
    }
})

//Test the profile
const profile = $profile.assemble(
    index(
        //$user's factory will not be called, but...
        $user.pack({ name: "John Doe" })
         //assemble still requires a valid value for db and session when using pack(),
         // since $db and $session are in the supply chain...
        $db.pack(undefined),
        // if you can't pass undefined, or some mock for them,
        // prefer using `.mock()` and `.hire()` instead.
        $session.pack(undefined),
    )
).unpack()

// profile === <h1>Profile of John Doe</h1>
```

### 2. `.mock()` and `.hire()` alternative implementations

For more complete alternative implementations, with complex dependency needs, you can use `.mock()` and `.hire()` instead of `.pack()` to access the whole power of your supply chain. The same example as above could be:

```tsx
const $profile = service("profile").app({
    services: [$user],
    factory: ({ user }) => {
        return <h1>Profile of {user.name}</h1>
    }
})

const $user = service("user").app({
    services: [$db, $session],
    factory: ({ db, session }) => {
        return db.findUserById(session.userId)
    }
})

const $userMock = $user.mock({
    services: [],
    factory: () => "John Doe"
})

//You no longer need to pass some value for $db and $session, since $userMock removes them from the supply chain.
const profile = $profile.hire($userMock).assemble({}).unpack()

profile === <h1>Profile of John Doe</h1>
```

`.mock()` and `.hire()` can be used for testing, but also to swap implementations at runtime for sandboxing or A/B testing.

## Design Philosophy: The Problem with Traditional DI

DI containers have always felt abstract, technical, almost magical in how they work. Like a black box, you often have to dig into the source code of a third-party library to understand how data flows in your own application. It feels like you lose control of your own data when you use one, and your entire app becomes dependent on the container to even work. typectx aims to make DI cool again! The pattern has real power, even if current implementations on the open-source market hide that power under a lot of complexity.

DI was complex to achieve in OOP world because of the absence of first-class functions. But in more functional languages, DI should be easier, since DI itself is a functional pattern. However, TypeScript DI frameworks currently available seem to have been built by imitating how they were built in OOP languages...

The problem DI was solving in OOP still exists in a more functional world. In OOP, DI helped inject data and services freely within deeply nested class hierarchies and architectures. With only functions though, DI achieves a similar purpose: inject data and services freely in deeply nested function calls. Deeply nested function calls naturally emerge when trying to decouple and implement SOLID principles in medium to highly complex applications. Without DI, you cannot achieve maximal decoupling. Even if in principle you can reuse a function elsewhere, the function is still bound in some way to the particular call stack in which it finds itself, simply by the fact that it can only be called from a parent function that has access to all the data and dependencies it needs.

typectx can do everything DI containers do, and more! It also achieves it in a more elegant, simpler, and easier-to-reason-about manner.

## How it Works Under the Hood

Injection happens statelessly via a memoized, recursive, self-referential, lazy object. Here is a simplified example:

```typescript
const supplies = {
    // request data is provided directly
    inputA,
    inputB,

    // Products are wrapped in a function to be lazily evaluated and memoized.
    // The supplies object is passed to assemble, creating a recursive structure.
    productA: once(() => productA.service.assemble(supplies)),
    productB: once(() => productB.service.assemble(supplies))
    // ...
}
```

The `assemble()` call builds the above supplies object, each product now ready to be injected and built.

This functional approach allows typescript to follow the types across the entirety of the dependency chain, which it cannot do for traditional stateful containers.

## API reference

See [the docs](https://typectx.github.io/typectx/docs/api-reference) for the full API reference!

## Contributing

We welcome contributions! Please feel free to submit issues and pull requests.

## License

MIT

---

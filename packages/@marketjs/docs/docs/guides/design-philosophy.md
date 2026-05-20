---
title: "Design Philosophy"
description: "Discover the design philosophy behind typectx. Learn how its supply chain metaphor for dependency injection simplifies development compared to traditional DI containers."
keywords:
    - design philosophy
    - dependency injection
    - supply chain
    - typescript
    - typectx
    - inversion of control
---

# Design Philosophy

## The Problem with Traditional DI

DI containers have always felt abstract, technical, almost magical in how they work. Like a black box, you often have to dig into the source code of a third-party library to understand how data flows in your own application. It feels like you lose control of your own data when you use one, and your entire app becomes dependent on the container to even work. typectx aims to make DI cool again! The pattern has real power, even if current implementations on the open-source market hide that power under a lot of complexity.

DI was complex to achieve in OOP world because of the absence of first-class functions in OOP languages. But in modern functional languages, DI should be easier, since DI itself is a functional pattern (See "Poor man' DI", or "Pure DI"). However, TypeScript DI frameworks currently available seem to have been built by imitating how they were built in OOP languages...

The problem DI was solving in OOP world still exists in the functional world. In OOP world, DI helped inject data and services freely within deeply nested class hierarchies and architectures. In the functional world, DI achieves the same: inject data and services freely in deeply nested function calls. Deeply nested function calls naturally emerge when trying to decouple and implement SOLID principles in medium to highly complex applications. Without DI, you cannot achieve maximal decoupling. Even if in principle you can reuse a function elsewhere, the function is still bound in some way to the particular call stack in which it finds itself, simply by the fact that it can only be called from a parent function that has access to all the data and dependencies it needs.

typectx's "Dependency Injection Supply Chain" (DISC) model can do everything containers do, but in a more elegant, simpler, and easier-to-reason-about manner.

## The Supply Chain Metaphor

typectx uses an intuitive supply chain metaphor to make dependency injection easier to understand. You create fully-decoupled, hyper-specialized **services** that exchange **request data** and **products** in a free-market fashion to assemble new, more complex products.

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

## How it Works Under the Hood

Injection happens statelessly via a memoized, recursive, self-referential, lazy object. Here is a simplified example:

```typescript
const supplies = {
    // Request data is provided directly
    reqA,
    reqB,

    // Products are wrapped in a function to be lazily evaluated and memoized.
    // The supplies object is passed to assemble, creating a recursive structure.
    productA: once(() => productA.service.assemble(supplies)),
    productB: once(() => productB.service.assemble(supplies))
    // ...
}
```

The `assemble()` call builds the above supplies object, each product now ready to be injected and built.

This functional approach allows typescript to follow the types across the entirety of the dependency chain, which it cannot do for traditional stateful containers.

---
title: "Simple Example"
description: "View a simple example of a todo app built with typectx, demonstrating basic concepts like markets, request services, app services, and assembly for dependency injection."
keywords:
    - example
    - simple example
    - todo app
    - typescript
    - dependency injection
    - typectx
---

# Simple example

Dummy todo app built with typectx.

```typescript
import { index, service } from "typectx"

// 1. Define request and app services
const $session = service("session").request<{ userId: string }>()
const $todosDb = service("todosDb").app({
    factory: () => new Map<string, string[]>() // Simple in-memory DB
})
const $addTodo = service("addTodo")
    .app({
        services: [$session, $todosDb],
        factory:
            ({ session, todosDb }) =>
            (todo: string) => {
                const userTodos = todosDb.get(session.userId) || []
                todosDb.set(session.userId, [...userTodos, todo])
                return db.get(session.userId)
            }
    })
    .preassemble()

/*Here, we define two types of services:

-   `$session`: A **Request** service that will hold the current user's session data.
-   `$todosDb`: An **App** service that provides an in-memory `Map` to act as a database. It has no dependencies.
-   `$addTodo`: An **App** service that creates our main, preassembled `addTodo` function. It depends on both the `$session` and `$todosDb`. */

const session = { userId: "user123" }

// 3. Assemble and use

server.onRequest((req) => {
    const addTodo = $addTodo
        // We only need to provide resource dependencies to assemble(). Products are auto-wired
        .assemble(index($session.pack(session)))
        .unpack()

    console.log(addTodo("Learn typectx")) // ["Learn typectx"]
    console.log(addTodo("Build app")) // ["Learn typectx", "Build app"]
})
```

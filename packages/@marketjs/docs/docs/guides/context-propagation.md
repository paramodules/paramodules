---
title: "Context Propagation"
description: "Learn how to propagate and override context in typectx with ctx(...).assemble() and hire(...)."
keywords:
    - context propagation
    - reassemble
    - dependency injection
    - typescript
    - typectx
    - nested context
---

# Context Propagation

Context propagation is how typectx creates nested sub-contexts without global state. The core primitive is `ctx($service).assemble(...)`:

- `ctx(...)` keeps the current context and any hired replacements.
- `.assemble(...)` lets you add or override request supplies deeper in the call stack.

## The mental model

A complex app often has "sub-requests" inside a request (for example, one `postId` per feed item). You can model each sub-request by reassembling a service with extra request data, while still inheriting parent context (session, db, feature flags, etc.).

```tsx
const $session = service("session").request<Session>()
const $postId = service("postId").request<string>()
const $db = service("db").app({ factory: () => connectDb() })

const $Post = service("Post").app({
    services: [$db, $postId, $session],
    factory:
        ({ db, postId, session }) =>
        () => {
            const post = db.getPost(postId)
            return (
                <article>
                    <h2>{post.title}</h2>
                    <p>Hi {session.name}</p>
                </article>
            )
        }
})

const $Feed = service("Feed").app({
    services: [$db],
    factory:
        ({ db }, ctx) =>
        () => {
            const ids = db.getPostIds()
            return (
                <>
                    {ids.map((id) => {
                        const Post = ctx($Post)
                            .assemble(index($postId.pack(id)))
                            .unpack()
                        return <Post key={id} />
                    })}
                </>
            )
        }
})
```

## Why `ctx(...)` matters

Using `ctx(...)` inside factories is important for two reasons:

1. It respects hires/mocks from upstream composition roots.
2. It narrows `assemble(...)` requirements to only what is not already known in the current context.

Calling module-scope services directly inside factories bypasses those guarantees.

## Automatic lifecycle management in nested contexts

Nested assembly also benefits from typectx's automatic lifecycle management.

When you call `ctx($service).assemble(...)`, typectx preserves any already-known app services that are still valid for the new sub-context, and only rebuilds the branches affected by:

- newly supplied request data
- overridden values
- newly hired services

In the feed example above, a request-free dependency like `$db` can be reused for every post card, while `$Post` is rebuilt for each different `postId`.

## Reassemble an already-used dependency

You can also reassemble an existing dependency with new request data. This allows, for example, to run a function impersonating a different user than the currently logged-in user:

```ts
const $sendMoney = service("sendMoney").app({
    services: [$addWalletEntry],
    factory: ({ addWalletEntry }, ctx) => {
        return (toUserId: string, amount: number) => {
            addWalletEntry(-amount)

            const addTargetWalletEntry = ctx($addWalletEntry)
                .assemble(index($session.pack({ userId: toUserId })))
                .unpack()

            addTargetWalletEntry(amount)
        }
    }
})
```

This pattern keeps the same business logic but runs it in a different nested context.

## Batch nested assembly with `hire(...)`

If multiple services need the same new context, batch them in one contextual assembly:

```tsx
const PostSupply = ctx($Post)
    .hire($PostAISummary, $PostTopComments)
    .assemble(index($postId.pack(postId)))

const Post = PostSupply.unpack()
const PostAISummary = PostSupply.deps.PostAISummary
const PostTopComments = PostSupply.deps.PostTopComments
```

This avoids building separate nested contexts for each product and improves performance.

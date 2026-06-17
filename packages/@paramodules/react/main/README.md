# @paramodules/react

**A typed React Context layer for paramodules.**

`@paramodules/react` is an adapter between React client components and the
[paramodules](https://github.com/paramodules/core) module graph. It does not
replace React Context — it uses Context under the hood to broadcast param values
through the tree, while paramodules handles dependency wiring, type inference,
and request-scoped resolution everywhere else.

Think of it as a nicer, typed way to do the things you already reach for Context
for: session state, current record, feature flags, or any value that should
change for a subtree without prop drilling. Regular paramodules modules keep
working as they always have; this package adds React-friendly hooks and
providers on top.

---

## Install

```bash
npm install paramodules @paramodules/react
```

Peer dependencies: `react`, `react-dom` (19+).

```ts
import { ParamsProvider, service, useSupplies } from "@paramodules/react"
import { index } from "paramodules"
```

Use `service` from `@paramodules/react` in client code so params get a React
Context attached. Use `service` from `paramodules` everywhere else (server
routes, loaders, tests).

---

## Mental model

Paramodules already models your app as a graph of params and modules. In React,
some of those params need to flow through the component tree the way Context
values do.

| React Context            | @paramodules/react                              |
| ------------------------ | ----------------------------------------------- |
| `createContext()`        | `service("session").param<T>()`                 |
| `<Provider value={...}>` | `<ParamsProvider for={$Module} params={...} />` |
| `useContext(ctx)`        | `useSupplies($Module, initSupplies).session`    |

The difference is that Context here is wired into the paramodules graph:

- **Params** declared with `@paramodules/react`'s `service().param()` carry a
  React Context. Descendants read them through `useSupplies`.
- **Modules** (components, data loaders, hooks-as-modules) are still plain
  paramodules `.module({ ... })` definitions. Their non-context dependencies
  resolve through the graph and arrive in the factory as `initSupplies`.
- **`ParamsProvider`** opens a typed param scope for a subtree. The `for` prop
  is only used for typing — it tells TypeScript which params the subtree may
  accept. Each supplied param is broadcast through its Context to descendants.

You keep writing normal React components. Paramodules keeps owning the
dependency graph. React Context handles propagation inside the tree.

## Why bother?

Plain React Context works, but it scatters types and wiring:

- Every consumer needs to know which Context to import.
- Providers must be nested manually with no compile-time check that descendants
  actually need those values.
- Context and non-context dependencies live in separate systems.

With `@paramodules/react`, a module's `required` list is the single source of
truth. TypeScript knows what each component needs. `ParamsProvider` is typed
from the module graph. Server code, tests, and client components can share the
same param and module definitions — only the React boundary adds Context.

---

## Quick example

### 1. Declare params and modules

Params that should propagate through React use `@paramodules/react`. Everything
else can stay on the core graph.

```tsx
// context.ts
import { service } from "@paramodules/react"

export const $currentPost = service("currentPost")
    .param<{ id: string } | undefined>()
    .init(undefined)

export const $userState =
    service("userState").param<[User | undefined, (user: User) => void]>()
```

```tsx
// reply.tsx
import { service, useSupplies } from "@paramodules/react"
import { $currentPost, $userState } from "./context"

export const $Reply = service("Reply").module({
    required: [$currentPost, $userState],
    factory: (initSupplies) =>
        function Reply({ replyId }: { replyId: string }) {
            const { currentPost, userState } = useSupplies($Reply, initSupplies)
            const [user] = userState

            return (
                <div>
                    Reply {replyId} on post {currentPost?.id} as {user?.id}
                </div>
            )
        }
})
```

### 2. Provide params for a subtree

When a part of the tree needs different param values, wrap it with
`ParamsProvider`. Use `index(...)` to build the keyed supplier object, same as
`.request(...)` in core paramodules.

```tsx
import { ParamsProvider } from "@paramodules/react"
import { index } from "paramodules"
import { $currentPost } from "./context"
import { $Post } from "./post"

function Feed({ posts }: { posts: Post[] }) {
    return posts.map((post) => (
        <ParamsProvider
            key={post.id}
            for={$Post}
            params={index($currentPost.of(post))}
        >
            <Post />
        </ParamsProvider>
    ))
}
```

Each post gets its own `currentPost` scope. Descendants like `$Reply` read it
via `useSupplies` without intermediate components forwarding props.

### 3. Request the root module

At the entry point, request the root module the same way you would in any
paramodules app.

```tsx
import { createRoot } from "react-dom/client"
import { $App } from "./app"

const App = $App.request({}).get()
createRoot(document.getElementById("root")!).render(<App />)
```

---

## API

### `service(tm)`

Drop-in replacement for `paramodules`'s `service`, except `.param()` attaches a
React Context to the param.

```ts
const $session = service("session").param<{ userId: string }>()
```

Use this in client-side module definitions. Server-side code can keep using
`paramodules` directly.

### `withContext(param)`

Lower-level helper if you already have a param from core paramodules and want to
attach a Context manually.

```ts
import { service as coreService } from "paramodules"
import { withContext } from "@paramodules/react"

const $theme = withContext(coreService("theme").param<"light" | "dark">())
```

### `useSupplies(module, initSupplies)`

Read the resolved supplies for a module inside a React component.

```tsx
factory: (initSupplies) =>
    function MyComponent() {
        const { session, db, theme } = useSupplies($MyComponent, initSupplies)
        // ...
    }
```

For each dependency in the module's `required` and `optionals`:

- If the service is a **context param** (declared via `@paramodules/react`),
  the current value is read from React Context with `use()`.
- Otherwise, the value comes from **`initSupplies`**, which paramodules resolved
  when the module was requested.

Call `useSupplies` in the component **returned by** the factory, not in the
factory body itself — same Rules of Hooks as any other hook.

### `ParamsProvider`

Broadcast param values to a subtree.

```tsx
<ParamsProvider
    for={$Feed.hire($SelectSession)}
    params={index($userState.of([user, setUser]), $currentPost.of(post))}
>
    {children}
</ParamsProvider>
```

- **`for`** — Provide which module needs new params. This is only used to correctly type-check the params prop.
- **`params`** — suppliers keyed by trademark, built with `.of(value)` and
  `index(...)`. All params are optional and will fallback to their previous or default value.

Internally, `ParamsProvider` nests one React Context.Provider per supplied param.

### Example

See the [example app](../examples/main) for a full bare-bones example of how to use the adapter

---

## Usage tips

**Rules of Hooks.** Call `useSupplies` inside the component returned by the
factory:

```tsx
factory: (initSupplies) =>
    function MyComponent() {
        const supplies = useSupplies($MyComponent, initSupplies)
        // ...
    }
```

**Suspense and async modules.** Async paramodules factories work as usual.
Combine with React `Suspense` and `use()` for promise-backed modules.

---

## License

MIT

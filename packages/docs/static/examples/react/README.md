# @paramodules/react example

A small social feed wireframe that shows how `@paramodules/react` connects
paramodules to React Context. Components are paramodules modules; params like
`currentPost` and `userState` flow through the tree with `ParamsProvider` instead
of prop drilling.

This project is owned by the docs site and launched with the StackBlitz SDK.
The files stay editable in the repository, and the docs page sends them to
StackBlitz as a Vite project.

---

## What this demo shows

- **Modules as components** — each UI piece is a `service(...).module({ factory })` that returns a React component.
- **Context params** — `$currentPost` and `$userState` are declared with `@paramodules/react`'s `service().param()` so they carry a React Context.
- **`useSupplies`** — each component reads its dependency graph in one call, like typed `useContext` for the whole module.
- **Subtree scopes** — `Feed` wraps each post in a `ParamsProvider`; `Post` can override `userState` for its own branch.
- **Async loading** — `$usersPromise` and `$postsPromise` are async modules consumed with React `Suspense` and `use()`.
- **Memoized async data** — the mock API modules use `memo:` with a localStorage-backed wrapper, so repeat page loads can reuse the paramodules cache key and skip the artificial network delay.

Open the app and try switching the session user on a post. Replies deep in the
tree update without any props passed through `Comment`.

---

## Project layout

```text
src/
├── context.ts          # Context params ($currentPost, $userState)
├── api.ts              # Mock data and async loader modules
├── cache.ts            # localStorage-backed memo wrapper
├── components/
│   ├── app.tsx         # Root layout, app-level ParamsProvider
│   ├── cache-status.tsx # Shows and clears persistent memo entries
│   ├── feed.tsx        # Lists posts, scopes currentPost per item
│   ├── post.tsx        # Post card, optional per-post userState override
│   ├── comment.tsx     # Comment list
│   ├── reply.tsx       # Reads currentPost + userState from context
│   └── session.tsx     # Session switcher UI
├── main.tsx            # Requests $App and mounts the tree
└── index.css           # Tailwind entry
```

---

## Suggested reading order

1. **`src/context.ts`** — params that should propagate through React.
2. **`src/cache.ts`** — a `memo(fn, cacheKey)` wrapper that stores resolved async values in localStorage.
3. **`src/api.ts`** — async data modules that opt into persistent memoization.
4. **`src/components/reply.tsx`** — a leaf component that reads context params via `useSupplies`.
5. **`src/components/feed.tsx`** — `ParamsProvider` scopes `currentPost` per post.
6. **`src/components/post.tsx`** — nested provider overrides `userState` for one post subtree.
7. **`src/components/app.tsx`** — root provider and composition of `Feed` + `SelectSession`.
8. **`src/main.tsx`** — entry point: `$App.request({}).get()`.

---

## Key patterns

### Request the root module

```tsx
const App = $App.request({}).get()
createRoot(document.getElementById("root")!).render(<App />)
```

No custom bootstrap layer — the root component comes straight from the
paramodules graph.

### Read supplies inside a component

```tsx
factory: (initSupplies) =>
    function Reply({ reply }) {
        const { currentPost, userStateContext } = useSupplies(
            $Reply,
            initSupplies
        )
        // ...
    }
```

Context params resolve from the nearest `ParamsProvider`. Other dependencies
resolve from `initSupplies` (the graph paramodules built at request time).

### Open a param scope for a subtree

```tsx
<ParamsProvider for={$Post} params={index($currentPost.of(post))}>
    <Post />
</ParamsProvider>
```

The `for` prop types which params you may supply.

### Persist async module results

```ts
const apiMemo = localStorageMemo("react-social-feed-v0.14")

export const $postsPromise = service("postsPromise").module({
    memo: apiMemo,
    factory: async () => {
        await sleep(1000)
        return populatedPosts
    }
})
```

Paramodules builds a cache key from the memo-enabled module versions and request
params, then passes it to `memo(fn, cacheKey)`. The example wrapper keeps the
supplier shape intact and only persists the resolved async value. The "Invalidate
cache and reload" button clears localStorage, calls `invalidate()` on the
memo-enabled API modules, and reloads so the root module request is rebuilt with
fresh keys.

`localStorageMemo` is built with `createSerializableValueMemo`, which can adapt
any external cache with a `readStorage(cacheKey)` and
`writeStorage(cacheKey, value)` pair. The serializable-value builder is
intentionally strict: it throws if a resolved module value is not
JSON-serializable. That is a storage-adapter rule, not a core paramodules rule.
In-memory memo wrappers can cache suppliers or opaque values directly.

---

## License

MIT

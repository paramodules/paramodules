# @paramodules/react example

A small social feed wireframe that shows how `@paramodules/react` connects
paramodules to React Context. Components are paramodules modules; params like
`currentPost` and `userState` flow through the tree with `ParamsProvider` instead
of prop drilling.

Run it on port **3001**:

```bash
pnpm dev
```

From the monorepo root:

```bash
pnpm --filter @paramodules/react.example dev
```

---

## What this demo shows

- **Modules as components** — each UI piece is a `service(...).module({ factory })` that returns a React component.
- **Context params** — `$currentPost` and `$userState` are declared with `@paramodules/react`'s `service().param()` so they carry a React Context.
- **`useSupplies`** — each component reads its dependency graph in one call, like typed `useContext` for the whole module.
- **Subtree scopes** — `Feed` wraps each post in a `ParamsProvider`; `Post` can override `userState` for its own branch.
- **Async loading** — `$usersPromise` and `$postsPromise` are async modules consumed with React `Suspense` and `use()`.

Open the app and try switching the session user on a post. Replies deep in the
tree update without any props passed through `Comment`.

---

## Project layout

```
src/
├── context.ts          # Context params ($currentPost, $userState)
├── api.ts              # Mock data and async loader modules
├── components/
│   ├── app.tsx         # Root layout, app-level ParamsProvider
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
2. **`src/api.ts`** — plain paramodules modules (async data, no Context).
3. **`src/components/reply.tsx`** — a leaf component that reads context params via `useSupplies`.
4. **`src/components/feed.tsx`** — `ParamsProvider` scopes `currentPost` per post.
5. **`src/components/post.tsx`** — nested provider overrides `userState` for one post subtree.
6. **`src/components/app.tsx`** — root provider and composition of `Feed` + `SelectSession`.
7. **`src/main.tsx`** — entry point: `$App.request({}).get()`.

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

---

## Related docs

- [@paramodules/react README](../../main/README.md)
- [paramodules core](https://github.com/paramodules/core)

---

## License

MIT

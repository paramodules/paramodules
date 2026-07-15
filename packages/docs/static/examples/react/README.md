# Paramodules React example

A small social-feed wireframe showing Paramodules working with React 19. The
React wrappers own interactive state; Paramodule modules compose it with data
and contextual params to produce JSX.

This project is owned by the docs site and launched with the StackBlitz SDK.
The docs page sends these repository files to StackBlitz as a Vite project.

## What this demo shows

- **JSX modules** — each `service(...).module(...)` supplies a React node (or
  a promise for one).
- **Typed request params** — `$post`, `$comment`, `$reply`, and `$userState`
  are bound with `index(...service.of(value))` when requesting a module.
- **Inherited module context** — child requests use `ctx($module)`, so a reply
  receives its current post and session without `Comment` forwarding props.
- **Scoped session state** — the app owns a global session state, while each
  `Post` can override it for its own subtree.
- **Async loading** — mock user and post modules are consumed through React
  `Suspense` and the React 19 `use()` API.
- **Two cache lifetimes** — data promises persist in `localStorage`; JSX
  promises use an in-memory cache so Suspense can reuse them while the page is
  open.

Open the app and switch a session inside one post. Its replies update without
passing session or post props through `Comment`.

## Project layout

```text
src/
├── api.ts                 # Mock social graph and delayed async data modules
├── cache.ts               # localStorage and in-memory cacher configurations
├── params.ts              # Typed Paramodule request params
├── components/
│   ├── App.tsx            # Owns the app-level React session state
│   └── Post.tsx           # Owns a per-post session override
├── jsx/
│   ├── app.tsx            # Root layout and Suspense boundaries
│   ├── feed.tsx           # Loads posts and renders Post wrappers
│   ├── post.tsx           # Renders a post and requests comment JSX
│   ├── comment.tsx        # Requests reply JSX with inherited context
│   ├── reply.tsx          # Displays the contextual post and session
│   └── session.tsx        # Reusable global/per-post session switcher
├── main.tsx               # React entry point
└── utils.tsx              # Promise-to-JSX bridge using React use()
```

## Suggested reading order

1. **`src/params.ts`** — the typed values that requests can supply.
2. **`src/components/App.tsx`** — React state is supplied to `$appJsx`.
3. **`src/jsx/reply.tsx`** — the leaf consumes `$reply`, `$post`, and
   `$userState`.
4. **`src/jsx/comment.tsx`** — `ctx($replyJsx)` supplies a reply while
   inheriting the post and session context.
5. **`src/components/Post.tsx`** — a nested React state value overrides the
   app session for one post.
6. **`src/cache.ts`** and **`src/api.ts`** — persistent resource caching for
   mock data and in-memory caching for JSX promises.

## Key patterns

### Bind params while requesting JSX

```tsx
const jsx = $appJsx.request(index($userState.of(userState))).get()
```

`userState` is a React state tuple held by `App`. It enters the Paramodule graph
only at this request boundary.

### Inherit context for a child request

```tsx
ctx($commentJsx)
    .request(index($comment.of(comment), $post.of(post)))
    .get()
```

`ctx()` carries upstream supplies into the child request. The comment is bound
explicitly, while a deeper reply can inherit the current post and user state.

### Suspend on a JSX promise

```tsx
export function AsyncJSX({ jsx }: { jsx: Promise<React.ReactNode> }) {
    return use(jsx)
}
```

`$users`, `$posts`, `$selectSessionJsx`, and `$feedJsx` are asynchronous.
`AsyncJSX` lets the surrounding `Suspense` boundary present a loading state.

### Use cache lifetimes deliberately

`$users` and `$posts` use a `localStorage`-backed resource cacher, so their
resolved mock values survive a refresh. `$feedJsx` and `$selectSessionJsx` use
an in-memory value cacher, which retains their JSX promises only for the
current page session.

To see the artificial three-second load again, clear this site's local storage
in browser devtools and refresh.

## License

MIT

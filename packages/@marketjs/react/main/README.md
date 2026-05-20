# @typectx/react

An adapter to use `typectx` with React client components. This library provides hooks to integrate `typectx`'s dependency injection into React applications, offering efficient updates and referential integrity.

The purpose of this library is mainly as a proof-of-concept that dependency injection can be integrated with React. It does not aim to become as stable as React Context yet, but can achieve all that React Context does as efficiently as it does.

## Features

- **Dependency Injection for React**: Define components as `typectx` app services and inject dependencies (request data or other components).
- **Referential Integrity**: Components assembled via `useAssembleComponent` maintain referential equality across re-renders, preventing unnecessary React tree updates.
- **Efficient Updates**: Uses `useSyncExternalStore` and an internal event store to propagate updates only to components that actually depend on changed resources, similar to how React Context works.

## Installation

```bash
npm install typectx @typectx/react
```

## API

### `useDeps`

Initializes a connection between a React component or hook with @typectx/react's internal store. Components registered will receive updated supplies when a parent component calls the useAssembleComponent hook. Think of this hook as equivalent to useContext, but giving you access to the whole deps object.

```typescript
function MyComponentFactory(initDeps, ctx) {
    return function MyComponent() {
        // Initialize the scope and destructure dependencies
        const {myCtx, MyComponent} = useDeps(initDeps);
        return <div>{myCtx, MyComponent}</div>;
    }
}
```

### `useAssembleComponent` (alias `useAssembleHook`)

Assembles a child component (or hook) with specific data. This hook ensures that the assembled component reference (and all its transitive component or hook dependencies) remains stable, even if the supplied pieces of context change (updates are handled internally via the store). So React always renders the same component, but the deps of that component update in a reactive way, preserving all React's optimizations, and preserving other pieces of state, across rerenders.

Usage:

```typescript
const Component = useAssembleComponent(
    // The service to assemble
    ctx($Component).hire($Dependency),
    // The pieces of context to supply
    index(
        $ctxService.pack(value)
    )
).unpack();

return <Component />;
```

## Usage Example

### 1. Define Request Services

Define your request data using `service(name).request<T>()`.

```typescript
// req.ts
import { service } from "typectx"

export const req = {
    $theme: service("theme").request<"light" | "dark">(),
    $user: service("user").request<{ name: string } | null>()
}
```

### 2. Define Components

Define your components with app services using `service(name).app(config)`.

```typescript
// components.ts
import { service, index } from "typectx";
import { useDeps, useAssembleComponent } from "@typectx/react";
import { req } from "./req";

// A child component that consumes 'theme'
export const $Button = service("Button").app({
    services: [req.$theme],
    // Name the function component so you can understand your component tree in React DevTools
    factory: (initDeps) => function Button({ children }) {
        const { theme } = useDeps(initDeps);

        return (
            <button style={{ background: theme === 'dark' ? '#333' : '#fff' }}>
                {children}
            </button>
        );
    }
});

// A parent component that assembles the child
// No call to useDeps since it has no dependencies in this example
export const $App = service("App").app({
    factory: (initDeps, ctx) => function App() {
        // Assemble the Button component with the current theme
        const Button = useAssembleComponent(
            ctx($Button),
            index(
                req.$theme.pack("dark") // Supplying 'dark' theme
            )
        ).unpack();

        return (
            <div>
                <h1>My App</h1>
                <Button>Click me</Button>
            </div>
        );
    }
});
```

### 3. Root Render

Assemble the root component and render it.

```typescript
// main.tsx
import { createRoot } from "react-dom/client";
import { index } from "typectx";
import { $App } from "./components";

const root = createRoot(document.getElementById("root"));

// Assemble the root App
const App = $App.assemble(index(/* root dependencies if any */)).unpack();

root.render(<App />);
```

## How it Works

1.  **Store & Subscription**: The library maintains a `WeakMap`-based store that links their initial state object (`initDeps`) to their current state (deps). `useInitDeps`subscribes the React component to this store using`useSyncExternalStore`.

2.  **Stable Assembly**: `useAssembleComponent` creates the component only once to preserve its referential stability. When supplied data changes, it checks if the assembled component or its transitive component dependencies depend directly on the changed data. The rerendering listeners of only those components get triggered.

# Usage tips

- **Rules of Hooks** - Don't call hooks in the factory's function body! If you call hooks, like useDeps() or useAssembleComponent(), either in a component or custom hooks, be sure to call it in a function **returned** by the factory, like so:

```tsx
{
    factory: (initDeps, ctx) => () => {
        useXYZ()

        //Or, If hook part of supplies:
        const { useXYZ } = useDeps(initDeps)
        useXYZ()
    }
}
```

- **React Context alternative** - All you can achieve with React Context can be achieved using @typectx/react's API:
    - `createContext()` → equivalent to defining a new piece of data with `service(...).request()` or `service(...).app(...)`
    - `useContext()` → equivalent to useDeps(initDeps).someData
    - `<Provider >` → equivalent to useAssembleComponent() with a new value for the supplied context.

    For a full showcase of this, head over to the [example](https://typectx.github.io/typectx/examples/react-client), which displays complex context propagation in a deeply nested component tree. See [Context Propagation](https://typectx.github.io/typectx/docs/guides/context-propagation) for full documentation.

- **Preload pattern** - All factories are eagerly prerun in parallel by default, so preloading is very easy. To preload data, look at file src/api.ts in the demo to see how data prefetching has been achieved with react-query to avoid waterfall loading. The following example shows how to use the preload pattern with @typectx/react.

```tsx
service("Component").app({
    factory: (initDeps, ctx) =>
        React.memo((props) => {
            // return jsx
        }),
    warmup: (Component, initDeps) => {
        <Component props={propSetToPreload1} />
        <Component props={propSetToPreload2} />
        <Component props={propSetToPreload3} />
    }
})
```

To see how to preload data with Tanstack Query and @typectx/react, head over to the [example's](https://typectx.github.io/typectx/examples/react-client) api.ts file

- **eslint-plugin-react-hooks/stable-components** - If you use the React official eslint plugin, you may receive complaints from the stable-components rule. useAssembleComponent() returns a component dynamically within another component, which the React Compiler flags as dangerous because every render, the component might have a different Object.is identity, which React uses to optimize renders and associate state. But useAssembleComponent() preserves the referential stability of the returned component across renders, so you can safely ignore this error.

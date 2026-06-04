---
title: "API Reference"
description: "Detailed API reference for typectx. Learn about service(name).request(), service(name).app(config), and core functions for type-safe dependency injection in TypeScript."
keywords:
    - api
    - reference
    - typectx
    - request
    - app
    - assemble
    - dependency injection
    - typescript
---

# API Reference

### `service(name).request<T>()`

Creates a service for a value from the user's request (request params, cookies, etc.) with type T.

```ts
const $session = service("session").request<Session>()
```

### `service(name).app(config)`

Creates an app service.

App services are automatically prepared when declared: typectx validates the dependency graph, builds a reusable assembly blueprint up front, and attempts an initial background assembly with whatever dependencies are already known. Request-free services can therefore pre-build at startup. If request data is still missing, the unresolved supply keeps a memoized error until that branch is accessed without the missing data.

```ts
const $product = service("product").app({
    services: [$service1, $service2], // Services
    factory: (deps, ctx) => {
        // Factory function
        // deps = dependencies received, can be destructured
        // ctx = Function to contextualize services used in the factory
        return serviceImplementation
    },
    warmup: (value, deps) => void, // Optional; runs right after factory returns
})
```

### `$service.pack(value)`

Provides a concrete value for a service, bypassing the factory in the case of app services.

```ts
const requestData = $requestService.pack(value)
const mockProduct = $appService.pack(mockValue) // For testing
```

### `$service.assemble(supplies)`

Resolves all dependencies and creates the service's product.

During assembly, typectx automatically preserves already-prepared app services when they are still valid for the new context, only rebuilds branches invalidated by new request supplies or `hire(...)`, and background-warms the whole reachable graph in parallel.

```ts
const supply = $product.assemble(suppliesObject)
const product = supply.unpack()
```

### `$service.mock(options)`

Creates an alternative implementation.

```ts
const $alternative = $originalService.mock({
    services: [$differentDeps],
    factory: (deps, ctx) => {
        /*... alternativeImplementationBody*/
    }
})
```

### `$service.hire(...hiredServices)`

Composition root method to wire additional services. Hired services replace originals
with the same name across the entire dependency chain.

```ts
const $modified = $originalService.hire($mockService)
```

You can also hire additional original services to batch-assemble multiple app services together. You access these resolved values through the returned supply's `deps`.

```ts
const ASupply = $A.hire($B, $C).assemble({})
// All assembled products will be available in $A's deps (see below)
const A = ASupply.unpack()
const B = ASupply.deps.B
const C = ASupply.deps.C
```

### `supply.deps`

Access resolved dependencies from outside a factory. See example above in `$service.hire()` section. TypeScript only exposes dependencies it can prove are present for that assembled service context.

### `index(...supplies)`

Utility to convert supply array to indexed object.

```ts
const suppliesObject = index(supply1, supply2, supply3)
// Equivalent to: { [supply1.service.name]: supply1, [supply2.service.name]: supply2, ... }
```

## Factory Function (`factory`)

The factory function is where your service logic lives. It receives two arguments:

- **`deps`**: An object of dependencies of the form: `{[service.name]: value}`
- **`ctx($service)`**: A function to access contextualized services in a factory and reassemble them with additional or overridden request data.

---
title: "Optional Dependencies"
description: "Learn how to use optional dependencies in typectx. Handle request data that may not always be present, such as feature flags or authentication contexts, with type safety."
keywords:
    [
        "optionals",
        "optional dependencies",
        "dependency injection",
        "typescript",
        "typectx",
        "feature flags",
        "authentication"
    ]
---

# Optionals

Optionals are request services that a factory _may_ depend on, but doesn't _require_ to function. When you declare a request service in the `optionals` array instead of the `services` array, you're telling typectx that:

1. The factory can be run without providing this request data
2. The request data will be `undefined` if not provided
3. TypeScript will enforce proper undefined checks when accessing the optional

This is particularly useful for feature flags, authentication contexts, caching layers, or any dependency that might not always be present.

## Basic Usage

Here's a simple example of using an optional resource:

```typescript
import { index, service } from "typectx"

// Define an optional apiKey
const $apiKey = service("apiKey").request<string>()

// Use it as an optional dependency
const $apiClient = service("apiClient").app({
    optionals: [$apiKey],
    // apiKey will be typed string | undefined
    factory: ({ apiKey }) => {
        return {
            makeRequest: async (endpoint: string) => {
                const headers: Record<string, string> = {
                    "Content-Type": "application/json"
                }

                // Use the API key if it's provided
                if (apiKey) {
                    headers["Authorization"] = `Bearer ${apiKey}`
                }

                return fetch(endpoint, { headers })
            }
        }
    }
})

// Assemble without the optional - works fine!
const client = $apiClient.assemble({}).unpack()

// Or provide it when available
const authenticatedClient = $apiClient
    .assemble(index($apiKey.pack("secret-api-key-123")))
    .unpack()
```

## Use case: Optional Authentication

Create services that work differently for authenticated vs. anonymous users:

```typescript
const $user = service("user").request<{
    userId: string
    name:string
    token: string
}>()

const $app = service("app").app({
    optionals: [$user],
    factory: ({ user }) => {
        if (!user) {
            return "Hello, guest!"
        }

        return `Hello, ${user.name}!`
    }
})

const token = //...
const supplies = isValid(token) ?
                    index($user.pack({ userId: "123", name: "John Doe", token }))
                    :{}
// Guest access
return $app.assemble(supplies).unpack()
```

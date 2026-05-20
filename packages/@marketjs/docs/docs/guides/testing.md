---
title: "Testing and Mocking"
description: "Learn how to test and mock dependencies with typectx. Use `.pack()` for simple mocks and `.mock()` with `.hire()` for complex testing scenarios in TypeScript."
keywords:
    - testing
    - mocking
    - typescript
    - dependency injection
    - typectx
    - unit testing
    - pack
    - mock
    - hire
---

# Testing and Mocking

typectx makes testing easy by providing two powerful mocking strategies, allowing you to isolate components and control dependencies during tests.

## Method 1: Mocking with `.pack()`

The simplest way to mock a dependency is to use `.pack()` on an **App Service**. This provides a direct value or object for that dependency, completely bypassing its factory function and its own dependencies.

**Use this for:** Simple mocks with simple known values

```typescript
// Production services
const $db = service("db").app({
    factory: () => {
        return {
            async findUser(id: string) {
                /*... Complex implementation...*/
            }
        }
    }
})
const $userRepo = service("userRepo").app({
    services: [$db],
    factory: ({ db }) => new UserRepo(db)
})

// In your test file
it("should return user data", async () => {
    const mockDb = {
        async findUser(id: string) {
            /*... Simple implementation*/
        }
    }

    // Assemble the service, packing the mock db directly. The mockDb type must extend the db type
    // Otherwise typescript will complain.
    const userRepo = $userRepo.assemble(index($db.pack(mockDb))).unpack()

    const user = await userRepo.getUser("user-123")

    expect(mockDb.findUser).toHaveBeenCalledWith("user-123")
})
```

**Note**: When you `.pack()` a product, you must still pass to its assemble() method all the request data it depends on recursively, even if they aren't used by the mock. You can often provide `undefined` if the types allow. For more complex cases, consider using .mock().

## Method 2: Mocking with `.mock()` and `.hire()`

For more complex scenarios where your mock needs its own logic, state, or dependencies, you can create a **mock**. A mock is a complete, alternative implementation of an app service.

**Use this for:**

- Complex mocks that need their own factories.
- Swapping a dependency and its entire sub-tree of dependencies.
- A/B testing and feature flagging.

```typescript
// Production user service
const $user = service("user").app({
    services: [$db, $session],
    factory: ({ db, session }) => db.findUserById(session.userId)
})

// Create a mock with a different factory and NO dependencies
const $userMock = $user.mock({
    services: [], // No dependencies for this mock
    // Return type of mock factory must extend return type of original factory
    // Otherwise Typescript will complain.
    factory: () => ({ name: "Mock John Doe" })
})

// The app service to test
const $profile = service("profile").app({
    services: [$user],
    factory: ({ user }) => `<h1>Profile of ${user.name}</h1>`
})

const profile = $profile
    .hire($userMock) // Swaps the original $user with the mock
    .assemble() // No resources needed, as the mock has no dependencies
    .unpack()

// profile === "<h1>Profile of Mock John Doe</h1>"
```

By using `.hire($userMock)`, you instruct the `$profile` to use the mock implementation instead of the real one. Because the mock has no dependencies, the final `.assemble()` call is much simpler.

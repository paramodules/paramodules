---
title: "DI containers are dead, long live context containers!"
slug: di-containers-are-dead-long-live-context-containers
authors:
    - name: Félix Dubé
      title: "@someone635"
      url: https://github.com/someone635
tags: []
image: "/img/equation.png"
hide_table_of_contents: false
---

![Equation banner](/img/equation.png)

:::info
This story is for you if:

-   You're still sad React Context cannot be used in Server Components.
-   You like the ideas of SOLID architecture and decoupling in your apps but have found current DI frameworks in TypeScript unsatisfying or too complex.
-   You've ever wanted to see a naked, frameworkless DI container in its simplest form (NSFW warning :P).
-   You love TypeScript and enjoy pushing its inference capabilities to their limits.

:::

This is the story of how, while refactoring my React app from Client to Server Components, I was forced to spend a year of my free time to:

1.  rediscover DI containers,
2.  obsolete traditional DI frameworks,
3.  discover Context containers, and
4.  finally, build my own fully type-inferred context container framework, typectx.

A tale of dumb, costly refactoring decisions that I hope produced a useful result in the end :).

{/* truncate */}

### Part 1: Inference-Driven Development

In my spare time, I was building a complex React application with deeply nested components that required React Context. The backend of my app at the time wasn't very clean, and I was passing complex objects around my functions. To ensure type safety, I needed to write explicit type definitions for these objects, which quickly became tedious.

But then I found a trick. Well, not really a trick, but a built-in TypeScript feature. When I needed to pass a complex object to a function's argument, instead of explicitly defining it, I just wrote a factory function for it and inferred the object's type from the factory's return type. So I could define functions with complex object dependencies like this:

```tsx
function(a: ReturnType<typeof AFactory>, b: ReturnType<typeof BFactory>)
```

This is nice, but it can put a lot of strain on the TypeScript compiler and slow down your editor. The solution is to define intermediate types to give the TypeScript inference process some pit stops:

```tsx
type A = ReturnType<typeof AFactory>
type B = ReturnType<typeof BFactory>
function(a: A, b: B)
```

So far, so good. With this simple trick, I didn't need to write explicit type definitions anywhere in my app. No more duplication between runtime JS and types! I became super productive, built about half of my application, and this trick never failed me. But it also made my app entirely dependent on TypeScript's type inference system...

### Part 2: How Full Type-Inference Doomed My Application

...and then catastrophe struck.

I knew my React app would benefit greatly from SSR, but I kept postponing the required refactoring. Then Server Components were released, and I couldn't wait to try them out! I started refactoring, only to soon realize that React Context wasn't supported in Server Components. However, I liked Server Components so much I decided to figure a way around that problem.

What the React team suggests in that situation is to either use a DI container or simply prop-drill, arguing that prop-drilling isn't so bad after all...

At first, I didn't want to prop-drill, knowing my app had deeply nested components that would sometimes require me to prop-drill 7 or 8 layers deep. So I looked at type-safe DI container frameworks but saw in their docs that they ensured type safety by explicitly typing the whole container. I wrongly assumed this meant I would need to explicitly type all my functions that I had let TypeScript infer until then. That would require days of writing explicit type definitions.

The prop-drilling refactoring seemed easier, so I went for it.

In hindsight, I guess I could have just used my inferred types to define the container's type. Anyway, I would have faced the same problem I eventually encountered by choosing the prop-drilling path: circular type definitions.

To keep my prop-drilling refactoring as streamlined as possible, I rewrote my Components to take in a `ctx` prop, which would contain all the args I needed to prop-drill, like so:

```tsx
const ServerComponent = ({ ctx: Ctx, ...props }) => "some jsx"
```

I also propagated the `ctx` prop to my backend data fetching functions and utilities when possible. Having just looked at DI containers, I thought to use the `ctx` prop to inject not only contextual data but also function dependencies, so that I could easily unit test my components and backend functions later. Basically, I was achieving DI by wiring my dependencies via prop-drilling instead of using a container for auto-wiring.

After a week or two of refactoring, all that was left was to build the `ctx` object that all my functions would receive. This is what my code looked like, over-simplified:

```tsx
const fnA = (ctx: Ctx) => "resultA"
const fnB = (ctx: Ctx) => "resultB"
// ...other fns...
const ctx = {
    user: someUser,
    other_data: some_other_data,
    fnA,
    fnB
}

type Ctx = typeof ctx
```

But TypeScript didn't like this; it threw an error:

`'ctx' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.(7022)`

I initially thought I had a simple mistake hidden in my code, a simple circular dependency I could easily fix, or maybe even that I had just reached the limits of Typescript's type inference. But after much head-scratching, I realized the problem was architectural, and that there was no easy way around it.

To know the type of `ctx`, TypeScript needed to know the types of `fnA` and `fnB`, but to know the functions' full types, it needed to know the type of `ctx`. It was a classic case of circular type dependency. It seemed my whole architecture couldn't be realized after all... Why didn't I think about that?

My entire refactoring effort to preserve full type-inference had led me straight into a wall. But quitting now would force me to refactor everything back, and to write all the explicit type definitions I had avoided all along. I had to find a solution.

### Part 3: The Solution

Finding a solution to this kind of circular type bug was hard, because even if I was using TypeScript inference a lot, I wasn't exactly sure how it worked under the hood. To be fair, the TypeScript docs don't really dive deep into the nitty-gritty details of inference. The way it's explained in the docs almost feels non-deterministic. TypeScript just tries to "guess" the types, and if it fails, it errors or uses default values. Okay... but I would like to know a bit more about the algorithm it uses to "guess" :P. So I tried stuff randomly, hoping it'd work. After many failed attempts, some much more convoluted and complex than others, I finally tried this simple thing:

```tsx
const ctx = {
    user: someUser,
    other_data: some_other_data,
    fnA: () => fnA,
    fnB: () => fnB
}
```

And the error went away. Sure, that changed my `ctx` object's API, meaning I would have to refactor all my functions again :P. But at least, I had access to everything I needed in my `ctx` object in a fully type-inferred way!

The reason it works is because the new lambda function's scope forces TypeScript's inference to "stop and ponder," in a way, which breaks up the circular type definitions.

### Part 4: A Naked DI Container Specimen

Now, when I first created my `ctx` object, I naively wanted to do this:

```tsx
const ctx = {
    user: someUser,
    other_data: some_other_data,
    fnA: fnA(ctx),
    fnB: fnB(ctx)
}
```

That way, I wouldn't have to prop-drill the `ctx` object anymore! But of course, both JS and TS complain here that `ctx` is not yet defined. So I was sure that when I tried the following, it wouldn't work either:

```tsx
const ctx = {
    user: someUser,
    other_data: some_other_data,
    fnA: () => fnA(ctx),
    fnB: () => fnB(ctx)
}
```

To my surprise, it worked! But why? `ctx` is not yet defined; I'm not even done assigning it to the variable! But JS is clever. Even if the assignment isn't complete, the variable exists in memory. Its reference can be passed via closure to the lambda functions' scope, and by the time the lambda is called, the `ctx` variable will be fully assigned. So it worked! I could remove the `ctx` prop-drilling everywhere!

Wait... I can remove prop-drilling? This means I've implemented DI? And then it clicked. My weird, lazy, self-referential `ctx` object looked similar to awilix's Proxy object, which awilix uses for its DI system. Awilix was the TypeScript DI framework I liked the most and found the most intuitive, so I have to thank its creator for the inspiration. Without that comparison, I don't think it would have clicked that this was DI.

But yes, it is a DI container! A naked, frameworkless DI container in its purest form. And, sorry for being emotional here, but I find it beautiful in its simplicity.

```tsx
// Let's admire this beauty again...
const ctx = {
    user: someUser,
    other_data: some_other_data,
    fnA: () => fnA(ctx),
    fnB: () => fnB(ctx)
}
```

Maybe I'm just dumb. Maybe people who use DI know it's based on this pattern. But I was just using DI without really knowing how it worked under the hood (again), and I hated how "magical" it felt. Now, I can just look at the pattern above and intuitively understand how it works.

Looking at the main TypeScript DI frameworks on the market—like awilix, inversify, tsyringe, typed-inject, TypeDI, etc.— I don't think this pattern is common knowledge. Most of them need to introduce a complex construct to achieve auto-wiring in their DI system: Proxy objects, decorators, annotations, reflect-metadata, compiler parsing of function arguments, etc. These complex constructs, except maybe for decorators, don't play nicely with TypeScript's inference system.

But my `ctx` object is auto-wired out of the box. I can just add data and services to it, and they are automatically injected into all the other services of the object, no matter the order in which they are defined.

### Part 5: From DI Containers to Context Containers

Initially, I didn't plan to make a package out of this. I just auto-wired my `ctx` object at the root of my application. It was a bit tedious but nothing too overwhelming. I thought DI container frameworks were obsolete now that most modern programming languages have lambda functions, which enable the `ctx` pattern above.

But then I got back to the UI side of my refactoring and wondered: how do I handle my React Contexts?

React Context and its Providers allow appending or overwriting values in the context for specific JSX sub-trees. But usually, in DI, you create only one container for your entire application, which wires everything up monolithically. There is no concept of subsections of your backend using a different context or container, as there is in React.

With my `ctx` object, however, I figured out it was easy to create a new, deeper context. Let's say I'm in a Component service. I can just create a deeper `newCtx` object like so:

```tsx
const ComponentService =
    (ctx: Ctx) =>
    (...props) => {
        const newCtx = {
            newData,
            NewComponent: () => NewComponentService(newCtx)
        }

        // Renders NewComponent in the new context
        return <newCtx.NewComponent />
    }
```

Cool! But what if I want to keep data and services from the old context and append or overwrite them with new ones? Naively, you'd think you could just do this:

```tsx
const newCtx = {
    ...ctx,
    NewComponent: () => NewComponentService(newCtx),
    newData
}
```

But you can't, since the services or components in `ctx` still have the old `ctx` in their injected closure! You end up with a mixed context where some services reside in the new context while others still reside in the old one.

The only way is to reinject `newCtx` into all services and components. Basically, you have to write the whole `ctx` object from scratch. There is no real shorthand way to write it, at least that I found. And I had a lot of React Contexts to refactor. I needed to find a way to automate and generalize the process of building the `ctx` object.

### Part 6: The Birth of typectx

It was at that moment, to solve this specific problem, that I decided to create typectx: the fully type-inferred Context and DI container framework. The goal? Like any DI framework, typectx traverses your dependency graph to collect the values and the types of all required dependencies of your app and automates the process of "assembling" (wiring) the ctx object (container). But moreover, it defines methods to quickly and immutably "reassemble" the container, to help you easily scaffold your app as a tree of flexible and decoupled sub-contexts, the same way you'd use React Context to scaffold your UI as a tree of sub-components and sub-contexts.

And today, I am proud to release typectx's first public beta version!

If you've read this far, it probably means typectx can help you streamline and solidify your code architecture in a context-aware and type-inferred way. It's completely framework-agnostic, so you can try it with any of your Typescript projects seamlessly.

It would mean the world to me if you gave it a quick try and shared your feedback, issues, and critiques! Join me on [Github](https://github.com/typectx/typectx), or just install it in your project:

```bash
npm install typectx
```

-   [Full documentation](https://typectx.github.io/typectx/docs/getting-started)
-   [Basic Usage guide](https://typectx.github.io/typectx/docs/guides/basic-usage)

Also, if you use React, I made a simple example with tips on how typectx can integrate with React functional components and hooks [here](https://typectx.github.io/typectx/examples/react-client).

Thank you so much for your attention, and may you keep building beautiful apps!

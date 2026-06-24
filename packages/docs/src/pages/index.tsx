import { type ReactNode } from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import Head from "@docusaurus/Head"
import Layout from "@theme/Layout"
import Heading from "@theme/Heading"
import CodeBlock from "@theme/CodeBlock"
import { GitHubIcon, NpmIcon } from "@site/src/components/BrandIcons"
import { OpenExampleButton } from "@site/src/components/OpenExampleButton"

import styles from "./index.module.css"

const heroCode = `import { index, service } from "paramodules"

const $session = service("session").param<{ userId: string }>()

const $profile = service("profile").module({
    required: [$session],
    factory: ({ session }) => ({ name: session.userId })
})

const $greeting = service("greeting").module({
    required: [$profile],
    factory: ({ profile }) => \`Hello, \${profile.name}!\`
})

const message = $greeting
    .request(index($session.of({ userId: "ada" })))
    .get()

// "Hello, ada!"`

const cascadeNodes = [
    { label: "User", detail: "logged in" },
    { label: "Loader", detail: "data fetch" },
    { label: "API", detail: "response" },
    { label: "Page", detail: "render" },
    { label: "Actions", detail: "permissions" }
] as const

const typeInferenceCode = `const $currentUser = service("currentUser").param<{
    id: string
    name: string
    avatarUrl: string | null
}>()

const $profile = service("profile").module({
    required: [$currentUser],
    factory: ({ currentUser }) => ({
        id: currentUser.id,
        label: currentUser.name,
        avatar: currentUser.avatarUrl ?? "/default-avatar.png"
    })
})

const $profileSummary = service("profileSummary").module({
    required: [$profile],
    factory: ({ profile }) => \`\${profile.label} (\${profile.id})\`
})`

const queryBuildingCode = `const $session = service("session").param<{
    orgId: string
    userId: string
}>()

const $visiblePosts = service("visiblePosts").module({
    required: [$session, $db],
    factory: ({ session, db }) =>
        db.select().from(posts).where(eq(posts.orgId, session.orgId))
})

const $myPosts = service("myPosts").module({
    required: [$session, $visiblePosts],
    factory: ({ session, visiblePosts }) =>
        visiblePosts.where(eq(posts.authorId, session.userId))
})

const $myDrafts = service("myDrafts").module({
    required: [$myPosts],
    factory: ({ myPosts }) => myPosts.where(eq(posts.status, "draft"))
})`

const cacheInvalidationCode = `import { create as createSyncCacher } from "@paramodules/sync-cacher"

const cache = new Map<string, unknown>()
const serializer = (value: unknown) => JSON.stringify(value)
const syncCaching = {
    cacher: createSyncCacher(cache),
    serializer
}

const $cart = service("cart").param<{
    items: Array<{ productId: string; quantity: number }>
}>()

const $cartProducts = service("cartProducts").module({
    required: [$cart],
    factory: ({ cart }) =>
        db.products.findManyById(cart.items.map((item) => item.productId)),
    caching: syncCaching
})

const $checkoutQuote = service("checkoutQuote").module({
    required: [$cart, $cartProducts],
    factory: ({ cart, cartProducts }) => {
        const lines = cart.items.map((item) => {
            const product = cartProducts.find((p) => p.id === item.productId)
            return {
                name: product.name,
                quantity: item.quantity,
                lineTotal: product.price * item.quantity
            }
        })

        return {
            lines,
            subtotal: lines.reduce((sum, line) => sum + line.lineTotal, 0)
        }
    },
    caching: syncCaching
})

const cart = { items: [{ productId: "coffee-mug", quantity: 2 }] }

const first = $checkoutQuote.request(index($cart.of(cart))).get()
const second = $checkoutQuote.request(index($cart.of(cart))).get()
const sameEntry = first === second // true

await db.products.update("coffee-mug", { price: 18 })
$cartProducts.invalidate()

const third = $checkoutQuote.request(index($cart.of(cart))).get()
const refreshed = second === third // false`

const propDrillingCode = `const $auditLog = service("auditLog").module({
    required: [$session, $db],
    factory:
        ({ session, db }) =>
        (action: string) =>
            db.audit.insert({ userId: session.userId, action })
})

const $report = service("report").module({
    required: [$auditLog],
    factory:
        ({ auditLog }) =>
        () =>
            auditLog("generated-report")
})`

const dataLoadingCode = `const $profile = service("profile").module({
    required: [$session, $db],
    factory: async ({ session, db }) =>
        await db.profiles.findByUserId(session.userId)
})

const $notifications = service("notifications").module({
    required: [$session, $db],
    factory: async ({ session, db }) =>
        await db.notifications.findForUser(session.userId)
})

const $dashboard = service("dashboard").module({
    required: [$profile, $notifications],
    factory: async ({ profile, notifications }) => ({
        profile: await profile,
        notifications: await notifications
    })
})

const dashboard = await $dashboard
    .request(index($session.of(session)))
    .get()`

const uiMutationCode = `import { useState } from "react"
    import { ParamsProvider, service, useSupplies } from "@paramodules/react"
    import { index } from "paramodules"
    
    const $count = service("count").param<[number, (n: number) => void]>()
        .init([0, () => {/* noop */}])
    
    const $Button = service("Button").module({
        required: [$count],
        factory: (s) => function Button() {
            const { count } = useSupplies($Button, s)
            const [n, setN] = count
            return <button onClick={() => setN(n + 1)}>{n}</button>
        }
    })
    
    const $Display = service("Display").module({
        required: [$count],
        factory: (s) => function Display() {
            const { count } = useSupplies($Display, s)
            return <p>Count: {count[0]}</p>
        }
    })
    
    const $Counter = service("Counter").module({
        required: [$Button, $Display],
        factory: (s) => function Counter() {
            const { Button, Display } = useSupplies($Counter, s)
            const countState = useState(0)
    
            return (
                <ParamsProvider
                    for={$Counter}
                    params={index($count.of(countState))}
                >
                    <Button />
                    <Display />
                </ParamsProvider>
            )
        }
    })`

const agentGraphCode = `const $session = service("session").param<{ userId: string }>()

const $profile = service("profile").module({
    required: [$session, $db],
    factory: ({ session, db }) =>
        db.profiles.findByUserId(session.userId)
})

const $notifications = service("notifications").module({
    required: [$session, $db],
    factory: ({ session, db }) =>
        db.notifications.findForUser(session.userId)
})

const $dashboard = service("dashboard").module({
    required: [$profile, $notifications],
    factory: async ({ profile, notifications }) => ({
        profile: await profile,
        notifications: await notifications
    })
})

// An agent reading $dashboard can see the whole upstream graph
// by following the required list`

const cascadeExamples = [
    {
        eyebrow: "Type inference cascades",
        title: "Types follow the graph.",
        description:
            "No need to type-hint your function arguments! Types flow automatically through all your modules.",
        code: typeInferenceCode
    },
    {
        eyebrow: "Query building cascades",
        title: "Compose data rules one module at a time.",
        description:
            "Never repeat any query logic anymore, build your database queries as modules and compose them together.",
        code: queryBuildingCode,
        reverse: true
    },
    {
        eyebrow: "Prop drilling cascades",
        title: "Deep modules declare what they need.",
        description:
            "Modules carry their dependency graph, so you don't need to drill props through every layer.",
        code: propDrillingCode
    },
    {
        eyebrow: "Data loading cascades",
        title: "Independent async loads run in parallel.",
        description:
            "$profile and $notifications both need $session and $db, but they don't need each other. Requesting $dashboard starts all 3 factories in the background and in parallel",
        code: dataLoadingCode,
        reverse: true
    },
    {
        eyebrow: "UI mutation cascades",
        title: "Mutations ripple through React Context.",
        description:
            "No more unwieldy Context Provider nested trees! @paramodules/react is a React Context adapter that lets you use paramodule's dependency graph for Context propagation, leading to a much nicer API and development experience",
        code: uiMutationCode,
        language: "tsx"
    },
    {
        eyebrow: "Cache invalidation cascades",
        title: "Caching doesn't have to be hard",
        description:
            "Invalidating caches manually is a thing of the past. Paramodules understands cache dependencies, so invalidating one module cascades and invalidates all dependents.",
        code: cacheInvalidationCode,
        reverse: true
    }
] as const

function Hero(): ReactNode {
    return (
        <section className={styles.hero}>
            <div className={styles.heroBackground} aria-hidden="true">
                <div className={styles.heroGradient}></div>
                <div className={styles.heroPattern}></div>
            </div>
            <div className="container">
                <div className={styles.heroContent}>
                    <div className={styles.heroText}>
                        <p className={styles.eyebrow}>
                            Modular, full-stack, and fully type-inferred
                            cascade-driven architecture
                        </p>
                        <Heading as="h1" className={styles.heroTitle}>
                            <span className={styles.heroTitleKeep}>
                                Request-time
                            </span>{" "}
                            modules for TypeScript
                        </Heading>
                        <p className={styles.heroSubtitle}>
                            Paramodules are stateless, request-scoped module
                            factories that carry their dependency graph. Provide
                            params at the entry point, request a module, and let
                            TypeScript infer the graph end to end.
                        </p>
                        <div className={styles.heroButtons}>
                            <OpenExampleButton
                                className={clsx("button", styles.primaryButton)}
                                errorClassName={styles.exampleError}
                            />
                            <Link
                                className={clsx(
                                    "button",
                                    styles.secondaryButton
                                )}
                                to="/blog"
                            >
                                Blog
                            </Link>
                            <Link
                                className={clsx(
                                    "button",
                                    styles.iconButton,
                                    styles.githubButton
                                )}
                                href="https://www.npmjs.com/package/paramodules"
                                aria-label="Visit paramodules on npm (opens in new tab)"
                            >
                                <NpmIcon className={styles.heroIcon} />
                            </Link>
                            <Link
                                className={clsx(
                                    "button",
                                    styles.iconButton,
                                    styles.githubButton
                                )}
                                href="https://github.com/paramodules/paramodules"
                                aria-label="Visit paramodules on GitHub (opens in new tab)"
                            >
                                <GitHubIcon className={styles.heroIcon} />
                            </Link>
                        </div>
                    </div>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeHeader}>
                            <div className={styles.codeDots} aria-hidden="true">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className={styles.codeTitle}>cascade.ts</span>
                        </div>
                        <CodeBlock
                            language="typescript"
                            className={styles.codeBlock}
                        >
                            {heroCode}
                        </CodeBlock>
                    </div>
                </div>
            </div>
        </section>
    )
}

function Decoupling(): ReactNode {
    return (
        <section className={styles.decouplingSection}>
            <div className={styles.decouplingGlow} aria-hidden="true" />
            <div className="container">
                <div className={styles.decouplingHeader}>
                    <Heading as="h2">
                        Functions and classes are the wrong unit of decoupling
                    </Heading>
                    <br />
                    <Heading as="h2">Modules are.</Heading>
                </div>

                <div
                    className={styles.cascadePanel}
                    aria-label="Cascade flow diagram"
                >
                    <div className={styles.cascadePanelHeader}>
                        <span>
                            One change ripples through your entire application
                        </span>
                    </div>
                    <div className={styles.cascadeTrack} role="list">
                        {cascadeNodes.map((node, index) => (
                            <div
                                className={styles.cascadeStep}
                                key={node.label}
                                role="listitem"
                            >
                                <div className={styles.cascadeNode}>
                                    <span className={styles.cascadeNodeLabel}>
                                        {node.label}
                                    </span>
                                    <span className={styles.cascadeNodeDetail}>
                                        {node.detail}
                                    </span>
                                </div>
                                {index < cascadeNodes.length - 1 ?
                                    <div
                                        className={styles.cascadeConnector}
                                        aria-hidden="true"
                                    >
                                        <span className={styles.cascadePulse} />
                                    </div>
                                :   null}
                            </div>
                        ))}
                    </div>
                </div>

                <div className={styles.decouplingBody}>
                    <p>
                        Functions and classes are tidy local units, but real
                        apps are dominated by <strong>cascades</strong> — a
                        logged-in user flows into loaders, API responses, page
                        actions, and mutation refreshes. Clean separation does
                        not remove that coupling; it just pushes the wiring
                        elsewhere: DI containers, framework runtimes, global
                        stores, manual cache invalidation, or prop drilling.
                    </p>
                    <p>
                        A function computes a value but does not carry the
                        cascade it belongs to. A paramodule does — it is the
                        factory plus the typed dependency graph, so the cascade
                        stays part of the primitive instead of something a
                        container rebuilds later.
                    </p>
                </div>
            </div>
        </section>
    )
}

function ValueProps(): ReactNode {
    const items = [
        {
            title: "Types flow through the graph",
            body: "Factories receive inferred supplies from required and optional modules. Rename an upstream field and downstream modules update at compile time."
        },
        {
            title: "Requests are isolated",
            body: "Each .request(...) creates an immutable snapshot. There is no global registry, singleton container, or hidden cross-request state."
        },
        {
            title: "Shared dependencies resolve once",
            body: "Diamond dependencies are memoized per request, and independent async factories can resolve in parallel by default."
        },
        {
            title: "Implementations can be swapped",
            body: "Use .mock(...) and .hire(...) to replace part of a cascade without changing downstream call sites."
        }
    ]

    return (
        <section className={clsx(styles.section, styles.altSection)}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Why paramodules?</Heading>
                </div>
                <div className={styles.cardGrid} role="list">
                    {items.map((item) => (
                        <article
                            className={styles.card}
                            key={item.title}
                            role="listitem"
                        >
                            <h3>{item.title}</h3>
                            <p>{item.body}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    )
}

function AiAgents(): ReactNode {
    return (
        <section className={clsx(styles.section, styles.agentsSection)}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Your AI agent&apos;s best friend</Heading>
                    <p>
                        Like a{" "}
                        <Link
                            href="https://graphify.net/"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Graphify
                        </Link>{" "}
                        map of your source code — except the graph is the
                        architecture, not a generated side hustle.
                    </p>
                </div>
                <div className={styles.split}>
                    <div className={styles.agentsText}>
                        <p>
                            AI agents navigate code by guessing: follow imports,
                            grep for symbols, infer coupling from folder layout.
                            Tools like{" "}
                            <Link
                                href="https://graphify.net/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Graphify
                            </Link>{" "}
                            build an explicit map of how files and functions
                            connect so an agent can orient faster — but that map
                            is generated, can drift from reality, and lives
                            outside your app.
                        </p>
                        <p>
                            Paramodules bakes the same idea into the codebase.
                            Every module declares its edges in{" "}
                            <code>required: [...]</code>, named by service
                            trademark. The graph is typed, validated at compile
                            time, and co-located with the factory it describes,
                            so the agent never gets lost.
                        </p>
                        <p>
                            Meaning you can let your agent vibe code
                            autonomously for much longer before your app turns
                            into an architectural spaghetti-fest.
                        </p>
                    </div>
                    <div className={styles.codeWindow}>
                        <div className={styles.codeHeader}>
                            <div className={styles.codeDots} aria-hidden="true">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                            <span className={styles.codeTitle}>graph.ts</span>
                        </div>
                        <CodeBlock
                            language="typescript"
                            className={styles.codeBlock}
                        >
                            {agentGraphCode}
                        </CodeBlock>
                    </div>
                </div>
            </div>
        </section>
    )
}

function ExampleBlock({
    eyebrow,
    title,
    description,
    code,
    reverse = false,
    language = "typescript"
}: {
    eyebrow: string
    title: string
    description: string
    code: string
    reverse?: boolean
    language?: string
}): ReactNode {
    return (
        <div className={clsx(styles.split, reverse && styles.reverseSplit)}>
            <div>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <Heading as="h2">{title}</Heading>
                <p>{description}</p>
            </div>
            <div className={styles.codeWindow}>
                <div className={styles.codeHeader}>
                    <div className={styles.codeDots} aria-hidden="true">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
                <CodeBlock language={language}>{code}</CodeBlock>
            </div>
        </div>
    )
}

function Examples(): ReactNode {
    return (
        <section className={styles.section}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Cascade examples</Heading>
                    <p>
                        The same module primitive shows up across common
                        full-stack flows.
                    </p>
                </div>
                {cascadeExamples.map((example) => (
                    <ExampleBlock key={example.title} {...example} />
                ))}
            </div>
        </section>
    )
}

function Install(): ReactNode {
    return (
        <section className={styles.ctaSection}>
            <div className="container">
                <div className={styles.ctaCard}>
                    <Heading as="h2">Install paramodules</Heading>
                    <CodeBlock language="bash">
                        npm install paramodules
                    </CodeBlock>
                    <p>
                        Full documentation lives in the package README on npm.
                    </p>
                    <div className={styles.ctaButtons}>
                        <OpenExampleButton
                            className={clsx("button", styles.primaryButton)}
                            errorClassName={styles.exampleError}
                        />
                        <Link
                            className={clsx("button", styles.secondaryButton)}
                            to="/blog"
                        >
                            Blog
                        </Link>
                        <Link
                            className={clsx(
                                "button",
                                styles.iconButton,
                                styles.githubButton
                            )}
                            href="https://www.npmjs.com/package/paramodules"
                            aria-label="Read paramodules on npm (opens in new tab)"
                        >
                            <NpmIcon className={styles.heroIcon} />
                        </Link>
                        <Link
                            className={clsx(
                                "button",
                                styles.iconButton,
                                styles.githubButton
                            )}
                            href="https://github.com/paramodules/paramodules"
                            aria-label="Visit paramodules on GitHub (opens in new tab)"
                        >
                            <GitHubIcon className={styles.heroIcon} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Home(): ReactNode {
    return (
        <Layout
            title="paramodules"
            description="Stateless, parametrizable runtime modules for cascading TypeScript applications."
        >
            <Head>
                <meta
                    name="keywords"
                    content="typescript, dependency graph, runtime modules, cascade, request scoped, paramodules"
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
            </Head>
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>
            <main id="main-content">
                <Hero />
                <Decoupling />
                <AiAgents />
                <ValueProps />
                <Examples />
                <Install />
            </main>
        </Layout>
    )
}

import type { ReactNode } from "react"
import clsx from "clsx"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import Layout from "@theme/Layout"
import Head from "@docusaurus/Head"
import Heading from "@theme/Heading"
import CodeBlock from "@theme/CodeBlock"
import SectionSeparator from "@site/src/components/SectionSeparator"

import styles from "./index.module.css"

const heroCode = `import { index, service } from "typectx"

// Define services
const $session = service("session").request<{ userId: string }>()
const $api = service("api").app({
    services: [$session],
    factory: ({ session }) => new ApiClient(session.userId)
})

// Assemble with type safety
const api = $api
    .assemble(index($session.pack({ userId: "123" })))
    .unpack()

// Use it!
const users = await api.getUsers()`

const typeExample = `const $flags = service("flags").request<{
    darkMode: boolean;
}>();

const $db = service("db").app({
    factory: () => new DatabaseClient() // Returns a DatabaseClient instance
});

const $userService = service("userService").app({
    services: [$flags, $db],
    factory: ({ flags, db }) => {
        // No explicit types needed! They are all inferred.
        // flags: { darkMode: boolean } (Inferred from the service(...).request<T>() definition)
        // db: DatabaseClient (Inferred from the $db's factory return type)

        return {
            getUser: (id: string) => db.fetchUser(id),
            wantsDarkMode: flags.darkMode
        };
    }
});`

const performanceExample = `// Defer expensive work: return a memoized function from the factory.
import { once, service } from "typectx"

const $generateReport = service("generateReport").app({
    factory: () =>
        once(() => {
            // Inner body runs only when something calls the returned function.
            console.log("🚀 Initializing Report Generator...");
            return new ReportGenerator().generate();
        })
});

const $app = service("app").app({
    services: [$reportGenerator],
    factory: (deps) => (userAction: "view_dashboard" | "generate_report") => {
        if (userAction === "generate_report") {
            deps.generateReport();
        }
    }
});`

const testingExample = `// An app service that depends on a real database.
const $userProfile = service("userProfile").app({
    services: [$db],
    factory: ({ db }) => ({
        bio: db.fetchBio()
    })
});

// For tests, create a mock with no dependencies.
const mockUserProfile = $userProfile.mock({
    services: [], // <-- No database needed!
    factory: () => ({
        bio: "This is a mock bio for testing."
    })
});

// The component we want to test.
const $app = service("app").app({
    services: [$userProfile],
    factory: ({ userProfile }) => \`<div>\${userProfile.bio}</div>\`
});

// In the test, just .hire() the mock.
// No need to provide a database connection!
const app = $app.hire(mockUserProfile).assemble().unpack();`

function Hero() {
    const { siteConfig } = useDocusaurusContext()
    return (
        <section className={styles.hero}>
            <div className={styles.heroBackground}>
                <div className={styles.heroGradient}></div>
                <div className={styles.heroPattern}></div>
            </div>
            <div className="container">
                <div className={styles.heroContent}>
                    <div className={styles.heroText}>
                        <Heading as="h1" className={styles.heroTitle}>
                            {siteConfig.title}
                        </Heading>
                        <p className={styles.heroSubtitle}>
                            Fully type-inferred Context and DI container for
                            Typescript.
                            <br />
                            <br />
                            Dependency injection (DI) and context propagation
                            without reflect-metadata, decorators, annotations or
                            compiler magic, just{" "}
                            <span className={styles.highlight}>
                                simple functions
                            </span>
                            .
                        </p>
                        <div className={styles.heroButtons}>
                            <Link
                                className={clsx("button", styles.primaryButton)}
                                to="/docs/getting-started"
                            >
                                Get Started
                                <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path d="M8 0L6.59 1.41L12.17 7H0V9H12.17L6.59 14.59L8 16L16 8L8 0Z" />
                                </svg>
                            </Link>
                            <Link
                                className={clsx(
                                    "button",
                                    styles.secondaryButton
                                )}
                                to="/docs/examples/simple-example"
                            >
                                View Example
                            </Link>
                        </div>
                        <div className={styles.heroStats} role="list">
                            <div className={styles.stat} role="listitem">
                                <span
                                    className={styles.statNumber}
                                    aria-label="Bundle size minified"
                                >
                                    ~5KB
                                </span>
                                <span className={styles.statLabel}>
                                    Minified
                                </span>
                            </div>
                            <div className={styles.stat} role="listitem">
                                <span
                                    className={styles.statNumber}
                                    aria-label="Bundle size minzipped"
                                >
                                    ~2KB
                                </span>
                                <span className={styles.statLabel}>
                                    Minzipped
                                </span>
                            </div>
                            <div className={styles.stat} role="listitem">
                                <span
                                    className={styles.statNumber}
                                    aria-label="Zero dependencies"
                                >
                                    0
                                </span>
                                <span className={styles.statLabel}>
                                    Dependencies
                                </span>
                            </div>
                            <div className={styles.stat} role="listitem">
                                <span
                                    className={styles.statNumber}
                                    aria-label="One hundred percent type safe"
                                >
                                    100%
                                </span>
                                <span className={styles.statLabel}>
                                    Type safe
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.heroCode}>
                        <div className={styles.codeWindow}>
                            <div className={styles.codeHeader}>
                                <div
                                    className={styles.codeDots}
                                    aria-hidden="true"
                                >
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                                <span className={styles.codeTitle}>
                                    typectx-demo.ts
                                </span>
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
            </div>
        </section>
    )
}

function WhySection() {
    return (
        <section className={styles.whySection}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Why choose typectx?</Heading>
                    <p>
                        Built for modern TypeScript applications that demand
                        performance, safety, and simplicity.
                    </p>
                </div>
                <div className={styles.whyGrid} role="list">
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            💡
                        </div>
                        <h3>Fully Type-Inferred</h3>
                        <p>
                            Zero type hints, definitions or boilerplate.
                            End-to-end type safety with compile-time dependency
                            validation.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            ✨
                        </div>
                        <h3>No Magic</h3>
                        <p>
                            Just functions and closures. No reflect-metadata,
                            decorators, or compiler magic. What you see is what
                            you get.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            🚀
                        </div>
                        <h3>Performance Focused</h3>
                        <p>
                            Smart memoization, lazy loading, and a tiny bundle
                            size (~5KB minified, ~2KB minzipped). Designed for
                            minimal runtime overhead.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            🧪
                        </div>
                        <h3>Testing Friendly</h3>
                        <p>
                            Easy mocking and dependency swapping. Swap
                            implementations effortlessly to achieve perfect test
                            isolation.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            🏗️
                        </div>
                        <h3>Scalable Architecture</h3>
                        <p>
                            Promotes SOLID, clean, and code-splittable design
                            patterns that grow with your application.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            🌍
                        </div>
                        <h3>Framework Agnostic</h3>
                        <p>
                            Works anywhere TypeScript works. Use it in React,
                            Node.js, Deno, or Bun—from frontend to backend.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            🔄
                        </div>
                        <h3>Stateless</h3>
                        <p>
                            Dependencies are resolved via closures, not global
                            state. This ensures clean, predictable, and
                            easy-to-reason-about behavior in any environment.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            📖
                        </div>
                        <h3>Intuitive Terminology</h3>
                        <p>
                            App services and request services + the supply chain
                            metaphor, makes dependency injection feel natural
                            and easier to understand.
                        </p>
                    </article>
                    <article className={styles.whyCard} role="listitem">
                        <div className={styles.whyIcon} aria-hidden="true">
                            🆕
                        </div>
                        <h3>A New DI Paradigm</h3>
                        <p>
                            Don't let your past experiences with DI prevent you
                            from trying this solution!
                        </p>
                    </article>
                </div>
            </div>
        </section>
    )
}

function FeatureSection({
    title,
    description,
    code,
    imageAlign = "right",
    variant = "default"
}: {
    title: string
    description: string
    code: string
    imageAlign?: "left" | "right"
    variant?: "default" | "alt"
}) {
    return (
        <section
            className={clsx(
                styles.featureSection,
                styles[`feature--${variant}`]
            )}
        >
            <div className="container">
                <div
                    className={clsx(
                        styles.featureContent,
                        imageAlign === "left" && styles.featureReverse
                    )}
                >
                    <div className={styles.featureText}>
                        <Heading as="h2">{title}</Heading>
                        <p>{description}</p>
                    </div>
                    <div className={styles.featureCode}>
                        <div className={styles.codeWindow}>
                            <div
                                className={styles.codeHeader}
                                aria-hidden="true"
                            >
                                <div className={styles.codeDots}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                            <CodeBlock language="typescript">{code}</CodeBlock>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

function UseCasesSection() {
    return (
        <section className={styles.useCasesSection}>
            <div className="container">
                <div className={styles.sectionHeader}>
                    <Heading as="h2">Perfect for modern apps</Heading>
                    <p>
                        From React components to API servers, typectx adapts to
                        your architecture.
                    </p>
                </div>
                <div className={styles.useCasesGrid} role="list">
                    <article className={styles.useCaseCard} role="listitem">
                        <div className={styles.useCaseIcon} aria-hidden="true">
                            ⚛️
                        </div>
                        <h3>React Applications</h3>
                        <p>
                            Eliminate prop drilling. Share context across
                            components without global state or complex
                            providers.
                        </p>
                        <div
                            className={styles.useCaseTags}
                            role="list"
                            aria-label="Supported technologies"
                        >
                            <span role="listitem">SSR</span>
                            <span role="listitem">Client</span>
                            <span role="listitem">Next.js</span>
                        </div>
                    </article>
                    <article className={styles.useCaseCard} role="listitem">
                        <div className={styles.useCaseIcon} aria-hidden="true">
                            🖧
                        </div>
                        <h3>APIs & Microservices</h3>
                        <p>
                            Request-scoped context propagation. Clean service
                            layers. Perfect for Express, Fastify, or any
                            framework.
                        </p>
                        <div
                            className={styles.useCaseTags}
                            role="list"
                            aria-label="Supported frameworks"
                        >
                            <span role="listitem">Express</span>
                            <span role="listitem">Fastify</span>
                            <span role="listitem">GraphQL</span>
                        </div>
                    </article>
                    <article className={styles.useCaseCard} role="listitem">
                        <div className={styles.useCaseIcon} aria-hidden="true">
                            🧪
                        </div>
                        <h3>Testing & A/B Testing</h3>
                        <p>
                            Swap implementations on the fly. Test different
                            strategies. Mock external services with ease.
                        </p>
                        <div
                            className={styles.useCaseTags}
                            role="list"
                            aria-label="Supported testing tools"
                        >
                            <span role="listitem">Jest</span>
                            <span role="listitem">Vitest</span>
                            <span role="listitem">Playwright</span>
                        </div>
                    </article>
                </div>
            </div>
        </section>
    )
}

function CTASection() {
    return (
        <section className={styles.ctaSection}>
            <div className="container">
                <div className={styles.ctaContent}>
                    <Heading as="h2">
                        Ready to revolutionize your DI with typectx?
                    </Heading>
                    <p>
                        Join developers who've already made the switch to
                        type-inferred dependency injection!
                    </p>
                    <div className={styles.ctaButtons}>
                        <Link
                            className={clsx("button", styles.primaryButton)}
                            to="/docs/getting-started"
                        >
                            Get Started Now
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 16 16"
                                fill="currentColor"
                                aria-hidden="true"
                            >
                                <path d="M8 0L6.59 1.41L12.17 7H0V9H12.17L6.59 14.59L8 16L16 8L8 0Z" />
                            </svg>
                        </Link>
                        <Link
                            className={clsx("button", styles.secondaryButton)}
                            to="/docs/getting-started"
                        >
                            View Documentation
                        </Link>
                    </div>
                    <div className={styles.ctaNote}>
                        <p>
                            <span aria-hidden="true">🚀</span> Install with{" "}
                            <code>npm install typectx</code>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default function Home(): ReactNode {
    const { siteConfig } = useDocusaurusContext()
    return (
        <Layout
            title={`${siteConfig.title} - Modern, Type-Safe DI and Context for TypeScript`}
            description={siteConfig.tagline}
        >
            <Head>
                <meta
                    name="keywords"
                    content="typescript, dependency injection, inversion of control, context propagation, type-safe, react, nodejs, deno, bun, typectx"
                />
                <link rel="preconnect" href="https://fonts.googleapis.com" />
            </Head>
            <a href="#main-content" className="skip-to-main">
                Skip to main content
            </a>
            <main id="main-content">
                <Hero />
                <SectionSeparator />
                <WhySection />
                <SectionSeparator />
                <FeatureSection
                    title="Fully Type-Inferred from End to End"
                    description="Catch dependency errors before they reach production. typectx's architecture provides end-to-end type inference, eliminating entire classes of bugs and ensuring your dependency graph is always valid."
                    code={typeExample}
                />
                <SectionSeparator />
                <FeatureSection
                    title="Unmatched Performance"
                    description="Smart memoization: dependencies are created in parallel once per context eagerly, and cached. Or return a memoized function from the factory to defer expensive work until it is first invoked."
                    code={performanceExample}
                    imageAlign="left"
                    variant="alt"
                />
                <SectionSeparator />
                <FeatureSection
                    title="Effortless Testing"
                    description="Isolate components completely. With .mock(), you can create alternative implementations for testing that remove entire dependency trees, leading to cleaner and more robust tests."
                    code={testingExample}
                />
                <SectionSeparator />
                <UseCasesSection />
                <SectionSeparator />
                <CTASection />
            </main>
        </Layout>
    )
}

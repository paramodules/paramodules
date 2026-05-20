import type { ReactNode } from "react"
import clsx from "clsx"
import Heading from "@theme/Heading"
import styles from "./styles.module.css"

type FeatureItem = {
    title: string
    icon: string
    description: ReactNode
}

const FeatureList: FeatureItem[] = [
    {
        title: "Fully Type-Inferred",
        icon: "🔒",
        description: (
            <>
                Zero type hints, definitions or boilerplate. End-to-end type
                safety with compile-time dependency validation
            </>
        )
    },
    {
        title: "No Magic",
        icon: "🪄",
        description: (
            <>
                Just functions and closures, no reflect-metadata, decorators,
                annotations or compiler magic. Clean, understandable code.
            </>
        )
    },
    {
        title: "Framework Agnostic",
        icon: "🌐",
        description: (
            <>
                Works everywhere TypeScript works. Frontend, backend, React,
                Node.js, Deno, Bun - you name it.
            </>
        )
    },
    {
        title: "Testing Friendly",
        icon: "🧪",
        description: (
            <>
                Easy mocking and dependency swapping with <code>.pack()</code>{" "}
                and <code>.mock()</code>. Perfect for unit tests and A/B
                testing.
            </>
        )
    },
    {
        title: "Performance Focused",
        icon: "⚡",
        description: (
            <>
                Smart memoization, eager or lazy factories, tree-shakeable. ~5KB
                minified. Optimal waterfalls with optional warmup.
            </>
        )
    },
    {
        title: "Stateless",
        icon: "🔄",
        description: (
            <>
                Dependencies resolved via closures, not global state. Enables
                full type-inference and context switching with{" "}
                <code>ctx(...)</code>.
            </>
        )
    }
]

function Feature({ title, icon, description }: FeatureItem) {
    return (
        <div className={clsx("col col--4", styles.feature)}>
            <div className="text--center">
                <div className={styles.featureIcon}>{icon}</div>
            </div>
            <div className="text--center padding-horiz--md">
                <Heading as="h3">{title}</Heading>
                <p>{description}</p>
            </div>
        </div>
    )
}

export default function HomepageFeatures(): ReactNode {
    return (
        <section className={styles.features}>
            <div className="container">
                <div className="row">
                    <div className="col col--12 text--center margin-bottom--lg">
                        <Heading as="h2">Why typectx?</Heading>
                        <p className="text--muted">
                            Modern dependency injection without the complexity
                            of traditional containers
                        </p>
                    </div>
                </div>
                <div className="row">
                    {FeatureList.map((props, idx) => (
                        <Feature key={idx} {...props} />
                    ))}
                </div>
            </div>
        </section>
    )
}

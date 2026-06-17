import type { ReactNode } from "react"
import Link from "@docusaurus/Link"
import Head from "@docusaurus/Head"
import Layout from "@theme/Layout"
import Heading from "@theme/Heading"

import styles from "./example.module.css"

const reactExampleUrl =
    "https://codesandbox.io/p/sandbox/github/typectx/typectx/tree/docs/packages/@typectx/react/examples/main"

export default function Example(): ReactNode {
    return (
        <Layout
            title="React example"
            description="A live CodeSandbox for the paramodules React example."
        >
            <Head>
                <meta
                    name="keywords"
                    content="paramodules, react, codesandbox, example"
                />
            </Head>
            <main className={styles.page}>
                <section className={styles.hero}>
                    <div className="container">
                        <p className={styles.eyebrow}>React example</p>
                        <Heading as="h1" className={styles.title}>
                            Try paramodules in React
                        </Heading>
                        <p className={styles.subtitle}>
                            Explore the live React example in CodeSandbox, with
                            the demo project ready to run in the browser.
                        </p>
                        <Link
                            className="button button--primary"
                            href={reactExampleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Open in CodeSandbox
                        </Link>
                    </div>
                </section>

                <section className={styles.sandboxSection}>
                    <div className="container">
                        <div className={styles.sandboxFrame}>
                            <iframe
                                title="Paramodules React example on CodeSandbox"
                                src={reactExampleUrl}
                                allow="accelerometer; ambient-light-sensor; camera; clipboard-read; clipboard-write; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
                                sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                            />
                        </div>
                    </div>
                </section>
            </main>
        </Layout>
    )
}

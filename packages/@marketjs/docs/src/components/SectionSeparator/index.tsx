import type { ReactNode } from "react"
import styles from "./styles.module.css"

export default function SectionSeparator(): ReactNode {
    return (
        <div className={styles.separator} role="separator" aria-hidden="true">
            <div className={styles.line} />
            <div className={styles.logoContainer}>
                <img
                    src="img/typectx-logo.png"
                    alt=""
                    className={styles.logo}
                    aria-hidden="true"
                />
            </div>
            <div className={styles.line} />
        </div>
    )
}

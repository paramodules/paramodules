import { type ReactNode, useState } from "react"
import clsx from "clsx"
import useBaseUrl from "@docusaurus/useBaseUrl"
import {
    loadReactExampleProject,
    reactExampleOpenFile
} from "../examples/react/project"

type OpenExampleButtonProps = {
    className?: string
    errorClassName?: string
}

export function OpenExampleButton({
    className,
    errorClassName
}: OpenExampleButtonProps): ReactNode {
    const [status, setStatus] = useState<"idle" | "opening" | "error">("idle")
    const reactExampleBaseUrl = useBaseUrl("/examples/react/")

    async function openExample() {
        setStatus("opening")

        try {
            const project = await loadReactExampleProject(reactExampleBaseUrl)
            const { default: sdk } = await import("@stackblitz/sdk")
            await sdk.openProject(project, {
                newWindow: true,
                openFile: reactExampleOpenFile,
                startScript: "dev",
                theme: "dark"
            })
            setStatus("idle")
        } catch {
            setStatus("error")
        }
    }

    return (
        <>
            <button
                className={className}
                type="button"
                onClick={() => {
                    void openExample()
                }}
                disabled={status === "opening"}
            >
                {status === "opening" ? "Opening..." : "See example"}
            </button>
            {status === "error" && errorClassName && (
                <span className={errorClassName} role="status">
                    Could not open StackBlitz.
                </span>
            )}
        </>
    )
}

export function OpenExampleNavbarItem({
    className,
    mobile
}: {
    className?: string
    mobile?: boolean
}): ReactNode {
    return (
        <OpenExampleButton
            className={clsx(
                className,
                !mobile && "navbar__item",
                "button button--primary button--sm",
                mobile && "button--block"
            )}
        />
    )
}

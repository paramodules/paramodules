import { use } from "react"

export function AsyncJSX({
    jsx: jsxPromise
}: {
    jsx: Promise<React.ReactNode>
}) {
    const jsx = use(jsxPromise)
    return jsx
}

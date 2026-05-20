import { useRef } from "react"

export function useAssertStable() {
    const ref = useRef<unknown>(undefined)
    const isFirstRender = useRef(true)
    return <T>(n: T) => {
        if (isFirstRender.current) {
            ref.current = n
            isFirstRender.current = false
            return n
        }
        if (ref.current !== n) {
            throw new Error(
                "Referential integrity violation: Component has changed since last render"
            )
        }

        return n
    }
}

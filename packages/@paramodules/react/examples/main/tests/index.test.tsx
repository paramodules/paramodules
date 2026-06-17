import { describe, it, expect } from "vitest"
import { $App } from "@/components/app"
import { render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"

describe("React Client", () => {
    it("should be able to render the app", async () => {
        const App = $App.request({}).get()

        render(
            <StrictMode>
                <App />
            </StrictMode>
        )
        expect(screen.getByText("Loading users...")).toBeInTheDocument()

        await waitFor(() => {
            expect(
                screen.getByText("Social Feed Wireframe")
            ).toBeInTheDocument()
        })
    })
})

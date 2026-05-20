import { describe, it, expect, vi } from "vitest"
import { $App } from "@/components/app"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { StrictMode } from "react"
import { index } from "typectx"
import { req } from "@/req"

describe("React Client", () => {
    it("should be able to render the app", async () => {
        const App = $App
            .assemble(index(req.$defaultUser.pack("userA")))
            .unpack()

        function Test() {
            return <p>Test</p>
        }

        expect(App).toBeDefined()
        render(
            <StrictMode>
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
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

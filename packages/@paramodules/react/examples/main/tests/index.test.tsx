import { describe, it, expect } from "vitest"
import { $App } from "@/components/app"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { StrictMode } from "react"
import { Provide } from "@marketjs/react"
import { req } from "@/context"

describe("React Client", () => {
    it("should be able to render the app", async () => {
        const supply = $App.buy({ defaultUser: req.$defaultUser.of("userA") })

        render(
            <StrictMode>
                <QueryClientProvider client={queryClient}>
                    <Provide supply={supply}>{(App) => <App />}</Provide>
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

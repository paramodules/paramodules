import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { $App } from "@/components/app"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { $postsQuery, $usersQuery } from "@/api"
import { Provide } from "@marketjs/react"
import { req } from "@/req"

queryClient.prefetchQuery($usersQuery.buy({}).unpack())
queryClient.prefetchQuery($postsQuery.buy({}).unpack())

const root = createRoot(document.getElementById("root") as HTMLElement)
root.render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <Provide
                supply={$App.buy({ defaultUser: req.$defaultUser.of("userA") })}
            >
                {(App) => <App />}
            </Provide>
        </QueryClientProvider>
    </StrictMode>
)

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { $App } from "@/components/app"
import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "@/query"
import { $postsQuery, $usersQuery } from "@/api"
import { index } from "typectx"
import { req } from "@/req"

queryClient.prefetchQuery($usersQuery.assemble({}).unpack())
queryClient.prefetchQuery($postsQuery.assemble({}).unpack())

const root = createRoot(document.getElementById("root") as HTMLElement)
const App = $App.assemble(index(req.$defaultUser.pack("userA"))).unpack()
root.render(
    <StrictMode>
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    </StrictMode>
)

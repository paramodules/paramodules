import { StrictMode, Suspense } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { $App } from "@/components/app"

const root = createRoot(document.getElementById("root") as HTMLElement)
const App = $App.request({}).get()
root.render(
    <StrictMode>
        <Suspense fallback={<div>Loading...</div>}>
            <App />
        </Suspense>
    </StrictMode>
)

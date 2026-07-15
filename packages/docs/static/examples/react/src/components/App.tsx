import { useState } from "react"
import { type User } from "@/api"
import { index } from "paramodules"
import { $userState } from "@/params"
import { $appJsx } from "@/jsx/app"

export function App() {
    const userState = useState<User | undefined>(undefined)
    return $appJsx.request(index($userState.of(userState))).get()
}

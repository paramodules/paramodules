import type { Post, User } from "@/api"
import { tm } from "@marketjs/trademarks"
import { createContext } from "react"

export type Session = [User | undefined, (user: User | undefined) => void]

const noop = () => {
    /* empty */
}

export const req = {
    $defaultUser: tm("defaultUser").spec<string>({
        context: createContext<string>("userA")
    }),
    $session: tm("session").spec<Session>({
        context: createContext<Session>([undefined, noop])
    }),
    $post: tm("post").spec<Post | undefined>({
        context: createContext<Post | undefined>(undefined)
    })
}

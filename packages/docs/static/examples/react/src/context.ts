import { service } from "@paramodules/react"
import type { Post, User } from "@/api"

export const $currentPost = service("currentPost")
    .param<Post | undefined>()
    .init(undefined)

export const $userStateContext = service("userStateContext")
    .param<[User | undefined, (user: User | undefined) => void]>()
    .init([
        undefined,
        () => {
            /* noop */
        }
    ])

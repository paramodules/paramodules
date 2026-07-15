import { service } from "paramodules"
import type { Comment, Post, Reply, User } from "@/api"

export const $post = service("post").param<Post>()

export const $comment = service("comment").param<Comment>()

export const $reply = service("reply").param<Reply>()

export const $userState = service("userState")
    .param<[User | undefined, (user: User | undefined) => void]>()
    .init([
        undefined,
        () => {
            /* noop */
        }
    ])

export const $postUserState = service("postUserState")
    .param<[User | undefined, (user: User | undefined) => void]>()
    .init([
        undefined,
        () => {
            /* noop */
        }
    ])

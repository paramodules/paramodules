import { useState } from "react"
import { type User } from "@/api"
import { index } from "paramodules"
import { $post, $userState } from "@/params"
import { type Post as PostType } from "@/api"
import { $postJsx } from "@/jsx/post"

export function Post({
    post,
    userState
}: {
    post: PostType
    userState: [User | undefined, (user: User | undefined) => void]
}) {
    const postUserState = useState<User | undefined>(undefined)

    return $postJsx
        .request(
            index(
                $post.of(post),
                $userState.of([
                    postUserState[0] ?? userState[0],
                    postUserState[1]
                ])
            )
        )
        .get()
}

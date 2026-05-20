import type { Post, User } from "@/api"
import { service } from "typectx"

export const req = {
    $defaultUser: service("defaultUser").request<string>(),
    $session:
        service("session").request<
            [User | undefined, (user: User | undefined) => void]
        >(),
    $post: service("post").request<Post>()
}

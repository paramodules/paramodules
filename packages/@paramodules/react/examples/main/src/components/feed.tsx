import { $postsPromise, type Post as PostType } from "@/api"
import { $Post } from "@/components/post"
import { useSupplies, service } from "@paramodules/react"
import { index } from "paramodules"
import { use } from "react"
import { ParamsProvider } from "@paramodules/react"
import { $currentPost } from "@/context"

export const $Feed = service("Feed").module({
    required: [$postsPromise, $Post],
    factory: (initSupplies) =>
        function Feed() {
            const { postsPromise, Post } = useSupplies($Feed, initSupplies)
            const posts = use(postsPromise)

            return (
                <div className="space-y-6">
                    {posts.map((post: PostType) => (
                        <ParamsProvider
                            key={post.id}
                            for={$Post}
                            params={index($currentPost.of(post))}
                        >
                            <Post />
                        </ParamsProvider>
                    ))}
                </div>
            )
        }
})

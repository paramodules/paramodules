import { createContext } from "react"
import { $postsQuery, type Post as PostType } from "@/api"
import { $Post } from "@/components/post"
import { useQuery } from "@tanstack/react-query"
import { useDeps } from "@marketjs/react"
import { tm } from "@marketjs/trademarks"

function Feed() {
    const { postsQuery, Post } = useDeps($Feed)
    const { data: posts } = useQuery(postsQuery)

    if (!posts) {
        return <div>Loading posts...</div>
    }

    return (
        <div className="space-y-6">
            {posts.map((post: PostType) => (
                <Post key={post.id} post={post} />
            ))}
        </div>
    )
}

export const $Feed = tm("Feed").service({
    required: [$postsQuery, $Post],
    context: createContext(Feed),
    factory: () => Feed
})

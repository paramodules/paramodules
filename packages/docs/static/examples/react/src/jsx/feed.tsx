import { $posts, type Post as PostType } from "@/api"
import { Post } from "@/components/Post"
import { service } from "paramodules"
import { $userState } from "@/params"
import { memoryCaching } from "@/cache"

export const $feedJsx = service("feedJsx")
    .module({
        required: [$posts, $userState],
        factory: async ({ posts: postsPromise, userState }) => {
            const posts = await postsPromise

            return (
                <div className="space-y-6">
                    {posts.map((post: PostType) => (
                        <Post post={post} userState={userState} />
                    ))}
                </div>
            )
        }
    })
    .caching(memoryCaching)

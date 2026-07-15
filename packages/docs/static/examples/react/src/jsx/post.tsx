import { $selectSessionJsx } from "@/jsx/session"
import { $commentJsx } from "@/jsx/comment"
import { AsyncJSX } from "@/utils"
import { service } from "paramodules"
import { Suspense } from "react"
import { $post, $comment } from "@/params"
import { index } from "paramodules"

export const $postJsx = service("postJsx").module({
    required: [$post, $selectSessionJsx],
    factory: ({ post, selectSessionJsx }, ctx) => {
        return (
            <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-purple-300">
                        📝 Post: {post?.id}
                    </h3>
                    <Suspense fallback={<div>Loading users...</div>}>
                        <AsyncJSX jsx={selectSessionJsx} />
                    </Suspense>
                </div>

                <div className="space-y-3">
                    {post?.comments.map((comment) =>
                        ctx($commentJsx)
                            .request(
                                index($comment.of(comment), $post.of(post))
                            )
                            .get()
                    )}
                </div>
            </div>
        )
    }
})

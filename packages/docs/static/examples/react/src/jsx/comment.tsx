import { $replyJsx } from "@/jsx/reply"
import { index, service } from "paramodules"
import { $comment, $post, $reply } from "@/params"

export const $commentJsx = service("commentJsx").module({
    required: [$post, $comment],
    factory: ({ comment }, ctx) => {
        return (
            <div className="border-2 border-green-500 rounded-lg p-3 bg-gray-800 ml-4">
                <h4 className="text-md font-medium text-green-300 mb-2">
                    💬 Comment: {comment.id}
                </h4>

                <div className="space-y-2">
                    {comment.replies.map((reply) => {
                        return ctx($replyJsx)
                            .request(index($reply.of(reply)))
                            .get()
                    })}
                </div>
            </div>
        )
    }
})

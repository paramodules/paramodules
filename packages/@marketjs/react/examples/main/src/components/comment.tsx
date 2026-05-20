import { $repliesQuery } from "@/api"
import { type Comment, type Reply } from "@/api"
import { $Reply } from "@/components/reply"
import { useQuery } from "@tanstack/react-query"
import { useDeps } from "@typectx/react"
import { useAssertStable } from "@/hooks"
import { service } from "typectx"

export const $Comment = service("Comment").app({
    services: [$repliesQuery, $Reply],
    factory: (initDeps) =>
        function Comment({ comment }: { comment: Comment }) {
            const { repliesQuery, Reply } = useDeps(initDeps)
            const { data: replies } = useQuery(repliesQuery(comment.id))

            const assertStableReply = useAssertStable()
            if (!replies) {
                return <div>Loading replies...</div>
            }

            assertStableReply(Reply)

            return (
                <div className="border-2 border-green-500 rounded-lg p-3 bg-gray-800 ml-4">
                    <h4 className="text-md font-medium text-green-300 mb-2">
                        💬 Comment: {comment.id}
                    </h4>

                    <div className="space-y-2">
                        {replies.map((reply: Reply) => (
                            <Reply key={reply.id} reply={reply} />
                        ))}
                    </div>
                </div>
            )
        }
})

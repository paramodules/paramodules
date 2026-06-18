import { type Comment as CommentType } from "@/api"
import { $Reply } from "@/components/reply"
import { useSupplies, service } from "@paramodules/react"

export const $Comment = service("Comment").module({
    required: [$Reply],
    factory: (initSupplies) =>
        function Comment({ comment }: { comment: CommentType }) {
            const { Reply } = useSupplies($Comment, initSupplies)

            return (
                <div className="border-2 border-green-500 rounded-lg p-3 bg-gray-800 ml-4">
                    <h4 className="text-md font-medium text-green-300 mb-2">
                        💬 Comment: {comment.id}
                    </h4>

                    <div className="space-y-2">
                        {comment.replies.map((reply) => (
                            <Reply key={reply.id} reply={reply} />
                        ))}
                    </div>
                </div>
            )
        }
})

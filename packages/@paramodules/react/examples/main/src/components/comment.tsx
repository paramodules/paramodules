import { createContext } from "react"
import { $repliesQuery } from "@/api"
import { type Comment as CommentType, type Reply as ReplyType } from "@/api"
import { $Reply } from "@/components/reply"
import { useQuery } from "@tanstack/react-query"
import { useDeps } from "@marketjs/react"
import { tm } from "@marketjs/trademarks"

function Comment({ comment }: { comment: CommentType }) {
    const { repliesQuery, Reply } = useDeps($Comment)
    const { data: replies } = useQuery(repliesQuery(comment.id))

    if (!replies) {
        return <div>Loading replies...</div>
    }

    return (
        <div className="border-2 border-green-500 rounded-lg p-3 bg-gray-800 ml-4">
            <h4 className="text-md font-medium text-green-300 mb-2">
                💬 Comment: {comment.id}
            </h4>

            <div className="space-y-2">
                {replies.map((reply: ReplyType) => (
                    <Reply key={reply.id} reply={reply} />
                ))}
            </div>
        </div>
    )
}

export const $Comment = tm("Comment").service({
    required: [$repliesQuery, $Reply],
    context: createContext(Comment),
    factory: () => Comment
})

import { req } from "@/req"
import type { Reply } from "@/api"
import { useDeps } from "@typectx/react"
import { service } from "typectx"

export const $Reply = service("Reply").app({
    services: [req.$post, req.$session],
    factory: (initDeps) =>
        function Reply({ reply }: { reply: Reply }) {
            const {
                post,
                session: [session]
            } = useDeps(initDeps)
            return (
                <div className="border-2 border-orange-500 rounded-lg p-2 bg-gray-800 ml-6">
                    <div className="flex justify-between items-center">
                        <h5 className="text-sm font-medium text-orange-300">
                            💭 Reply: {reply.id}
                        </h5>
                    </div>

                    <div className="mt-2 p-2 bg-gray-700 rounded text-xs">
                        <div className="space-y-1 text-gray-300">
                            <div>
                                👤 Current User:{" "}
                                <span className="text-orange-300">
                                    {session?.id ?? "Guest"}
                                </span>
                            </div>
                            <div>
                                📄 Current Post:{" "}
                                <span className="text-purple-300">
                                    {post.id}
                                </span>
                            </div>
                            <div>
                                💬 Comment:{" "}
                                <span className="text-green-300">
                                    {reply.commentId}
                                </span>
                            </div>
                            <div>
                                💭 Reply:{" "}
                                <span className="text-orange-300">
                                    {reply.id}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
})

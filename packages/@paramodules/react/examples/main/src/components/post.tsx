import { Suspense, useState } from "react"
import { type User } from "@/api"
import { ParamsProvider, service, useSupplies } from "@paramodules/react"
import { $Comment } from "@/components/comment"
import { $SelectSession } from "@/components/session"
import { $currentPost, $userStateContext } from "@/context"
import { index } from "paramodules"

export const $Post = service("Post").module({
    required: [$currentPost, $SelectSession, $Comment, $userStateContext],
    factory: (initSupplies) =>
        function Post() {
            const { currentPost, SelectSession, Comment, userStateContext } =
                useSupplies($Post, initSupplies)

            const [postUserState, setPostUserState] = useState<
                User | undefined
            >(undefined)

            return (
                <ParamsProvider
                    for={$Post.hire($SelectSession)}
                    params={index(
                        $userStateContext.of([
                            postUserState ?? userStateContext[0],
                            setPostUserState
                        ])
                    )}
                >
                    <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-lg font-semibold text-purple-300">
                                📝 Post: {currentPost?.id}
                            </h3>
                            <Suspense fallback={<div>Loading users...</div>}>
                                <SelectSession />
                            </Suspense>
                        </div>

                        <div className="space-y-3">
                            {currentPost?.comments.map((comment) => (
                                <Comment key={comment.id} comment={comment} />
                            ))}
                        </div>
                    </div>
                </ParamsProvider>
            )
        }
})

import { $commentsQuery, $userQuery, $usersQuery } from "@/api"
import type { Comment, Post } from "@/api"
import { useState } from "react"
import { $Comment } from "@/components/comment"
import { index, service } from "typectx"
import { req } from "@/req"
import { useQuery } from "@tanstack/react-query"
import { $SelectSession } from "./session"
import { useAssembleComponent, useDeps } from "@typectx/react"
import { useAssertStable } from "@/hooks"

export const $Post = service("Post").app({
    services: [
        req.$session,
        $usersQuery,
        $commentsQuery,
        $userQuery,
        req.$defaultUser
    ],
    optionals: [req.$post],
    factory: (initDeps, ctx) => {
        return function Post({ post }: { post: Post }) {
            const {
                userQuery,
                defaultUser,
                session: [session],
                usersQuery,
                commentsQuery
            } = useDeps(initDeps)
            const {
                data: defaultSession,
                status: defaultSessionStatus,
                isFetching: defaultSessionFetching,
                isError: defaultSessionIsError,
                error: defaultSessionError
            } = useQuery(userQuery(defaultUser))
            const { data: users } = useQuery(usersQuery)
            const { data: comments } = useQuery(commentsQuery(post.id))
            // Local session override - falls back to parent session until user changes it
            const [postSession, setPostSession] =
                useState<typeof session>(undefined)

            const assertStableSelectSession = useAssertStable()
            const assertStableComment = useAssertStable()

            const newCtx = index(
                req.$session.pack([
                    postSession ?? session ?? defaultSession,
                    setPostSession
                ]),
                req.$post.pack(post)
            )

            const CommentProduct = useAssembleComponent(
                ctx($Comment).hire($SelectSession),
                newCtx
            )

            const SelectSession = assertStableSelectSession(
                CommentProduct.deps[$SelectSession.name]
            )
            const Comment = assertStableComment(CommentProduct.unpack())

            if (!users || !comments) {
                return <div>Loading users or comments...</div>
            }

            return (
                <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-semibold text-purple-300">
                            📝 Post: {post.id}
                        </h3>
                        <SelectSession />
                    </div>

                    <div className="space-y-3">
                        {comments.map((comment: Comment) => (
                            <Comment key={comment.id} comment={comment} />
                        ))}
                    </div>
                </div>
            )
        }
    }
})

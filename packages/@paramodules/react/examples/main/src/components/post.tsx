import { createContext, useMemo, useState, type ReactNode } from "react"
import {
    $commentsQuery,
    $userQuery,
    $usersQuery,
    type Comment as CommentType,
    type Post as PostType,
    type User
} from "@/api"
import { $Comment } from "@/components/comment"
import { tm } from "@marketjs/trademarks"
import { req, type Session } from "@/req"
import { useQuery } from "@tanstack/react-query"
import { $SelectSession } from "@/components/session"
import { Provide, useDeps } from "@marketjs/react"

export const $Post = tm("Post").service({
    required: [
        $usersQuery,
        $commentsQuery,
        $userQuery,
        req.$defaultUser,
        $Comment,
        $SelectSession
    ],
    optionals: [req.$session, req.$post],
    context: createContext<(props: { post: PostType }) => ReactNode>(() => null),
    factory: (_, ctx) =>
        function Post({ post }: { post: PostType }) {
            const {
                userQuery,
                defaultUser,
                session,
                usersQuery,
                commentsQuery,
                Comment,
                SelectSession
            } = useDeps($Post)
            const outerSessionUser = session?.[0]
            const { data: defaultSession } = useQuery(userQuery(defaultUser))
            const { data: users } = useQuery(usersQuery)
            const { data: comments } = useQuery(commentsQuery(post.id))

            const [postSession, setPostSession] = useState<User | undefined>(
                undefined
            )

            const sessionValue = useMemo<Session>(
                () => [
                    postSession ?? outerSessionUser ?? defaultSession,
                    setPostSession
                ],
                [postSession, outerSessionUser, defaultSession]
            )

            if (!users || !comments) {
                return <div>Loading users or comments...</div>
            }

            return (
                <Provide
                    supply={ctx($Comment)
                        .hire($SelectSession)
                        .buy({
                            session: req.$session.of(sessionValue),
                            post: req.$post.of(post)
                        })}
                >
                    {() => (
                        <div className="border-2 border-purple-500 rounded-lg p-4 bg-gray-800">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="text-lg font-semibold text-purple-300">
                                    📝 Post: {post.id}
                                </h3>
                                <SelectSession />
                            </div>

                            <div className="space-y-3">
                                {comments.map((comment: CommentType) => (
                                    <Comment
                                        key={comment.id}
                                        comment={comment}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </Provide>
            )
        }
})

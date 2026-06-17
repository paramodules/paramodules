import { service } from "@paramodules/react"
import { sleep } from "paramodules"

export const mockUsers = [
    { id: "userA" },
    { id: "userB" },
    { id: "userC" }
] as const

export const mockPosts = [
    { id: "postA" },
    { id: "postB" },
    { id: "postC" },
    { id: "postD" }
] as const

export const mockComments = [
    { id: "commentA1", postId: "postA" },
    { id: "commentA2", postId: "postA" },
    { id: "commentB1", postId: "postB" },
    { id: "commentC1", postId: "postC" },
    { id: "commentC2", postId: "postC" },
    { id: "commentD1", postId: "postD" }
] as const

export const mockReplies = [
    { id: "replyA1a", commentId: "commentA1" },
    { id: "replyA1b", commentId: "commentA1" },
    { id: "replyA2a", commentId: "commentA2" },
    { id: "replyB1a", commentId: "commentB1" },
    { id: "replyC1a", commentId: "commentC1" },
    { id: "replyC1b", commentId: "commentC1" }
] as const

const populatedPosts = mockPosts.map((post) => {
    const comments = mockComments
        .filter((comment) => comment.postId === post.id)
        .map((comment) => {
            const replies = mockReplies.filter(
                (reply) => reply.commentId === comment.id
            )
            return {
                ...comment,
                replies: [...replies]
            }
        })
    return {
        ...post,
        comments: [...comments]
    }
})
export type User = (typeof mockUsers)[number]
export type Reply = (typeof mockReplies)[number]
export type Post = (typeof populatedPosts)[number]
export type Comment = Post["comments"][number]

export const $usersPromise = service("usersPromise").module({
    factory: async () => {
        await sleep(1000)
        return mockUsers
    }
})

export const $postsPromise = service("postsPromise").module({
    factory: async () => {
        await sleep(1000)
        return populatedPosts
    }
})

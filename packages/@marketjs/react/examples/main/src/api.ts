import { queryClient } from "@/query"
import { service, sleep } from "typectx"

// Simple wireframe types with minimal IDs
export interface User {
    id: string
}

export interface Post {
    id: string
}

export interface Comment {
    id: string
    postId: string
}

export interface Reply {
    id: string
    commentId: string
}

// Mock data with simple IDs
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

// Simulates an api that offers populated query results
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

// React Query hooks

export const $userQuery = service("userQuery").app({
    factory: () => (id: string) => {
        return {
            queryKey: ["user", id],
            queryFn: async () => {
                await sleep(1000)
                const user = mockUsers.find((user) => user.id === id)
                if (!user) {
                    throw new Error(`User with id ${id} not found`)
                }
                return user
            }
        }
    }
})

export const $usersQuery = service("usersQuery").app({
    services: [$userQuery],
    factory: () => {
        return {
            queryKey: ["users"],
            queryFn: async () => {
                await sleep(1000)
                return mockUsers
            }
        }
    },
    warmup: async (query, { userQuery }) => {
        const users = await queryClient.fetchQuery(query)
        for (const user of users) {
            queryClient.setQueryData(userQuery(user.id).queryKey, user)
        }
    }
})

export const $repliesQuery = service("repliesQuery").app({
    factory: () => (commentId: string) => {
        return {
            queryKey: ["replies", commentId],
            queryFn: async () => {
                await sleep(1000)
                return mockReplies.filter(
                    (reply) => reply.commentId === commentId
                )
            }
        }
    }
})

export const $commentsQuery = service("commentsQuery").app({
    factory: () => (postId: string) => {
        return {
            queryKey: ["comments", postId],
            queryFn: async () => {
                await sleep(1000)
                return mockComments.filter(
                    (comment) => comment.postId === postId
                )
            }
        }
    }
})

export const $postsQuery = service("postsQuery").app({
    services: [$commentsQuery, $repliesQuery],
    factory: () => {
        return {
            queryKey: ["posts"],
            queryFn: async () => {
                await sleep(1000)
                return populatedPosts
            }
        }
    },
    warmup: async (query, { commentsQuery, repliesQuery }) => {
        const posts = await queryClient.fetchQuery(query)
        for (const post of posts) {
            queryClient.setQueryData(
                commentsQuery(post.id).queryKey,
                post.comments
            )

            for (const comment of post.comments) {
                queryClient.setQueryData(
                    repliesQuery(comment.id).queryKey,
                    comment.replies
                )
            }
        }
    }
})

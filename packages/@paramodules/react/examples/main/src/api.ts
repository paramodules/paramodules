import { queryClient } from "@/query"
import { tm, sleep } from "@marketjs/trademarks"
import { createContext } from "react"

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

function userQueryFactory(id: string) {
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

export const $userQuery = tm("userQuery").service({
    context: createContext(userQueryFactory),
    factory: () => userQueryFactory
})

const usersQuery = {
    queryKey: ["users"],
    queryFn: async () => {
        await sleep(1000)
        return mockUsers
    }
}

export const $usersQuery = tm("usersQuery").service({
    required: [$userQuery],
    context: createContext(usersQuery),
    factory: () => usersQuery,
    warmup: async (query, { userQuery }) => {
        const users = await queryClient.fetchQuery(query)
        for (const user of users) {
            queryClient.setQueryData(userQuery(user.id).queryKey, user)
        }
    }
})

function repliesQueryFactory(commentId: string) {
    return {
        queryKey: ["replies", commentId],
        queryFn: async () => {
            await sleep(1000)
            return mockReplies.filter((reply) => reply.commentId === commentId)
        }
    }
}

export const $repliesQuery = tm("repliesQuery").service({
    context: createContext(repliesQueryFactory),
    factory: () => repliesQueryFactory
})

function commentsQueryFactory(postId: string) {
    return {
        queryKey: ["comments", postId],
        queryFn: async () => {
            await sleep(1000)
            return mockComments.filter((comment) => comment.postId === postId)
        }
    }
}

export const $commentsQuery = tm("commentsQuery").service({
    context: createContext(commentsQueryFactory),
    factory: () => commentsQueryFactory
})

const postsQuery = {
    queryKey: ["posts"],
    queryFn: async () => {
        await sleep(1000)
        return populatedPosts
    }
}

export const $postsQuery = tm("postsQuery").service({
    required: [$commentsQuery, $repliesQuery],
    context: createContext(postsQuery),
    factory: () => postsQuery,
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

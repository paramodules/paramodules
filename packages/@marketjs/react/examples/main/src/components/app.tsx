import { $Feed } from "@/components/feed"
import { $SelectSession } from "@/components/session"
import { req } from "@/req"
import { $userQuery, type User } from "@/api"
import { useState } from "react"
import { index, service } from "typectx"
import { useAssembleComponent, useDeps } from "@typectx/react"
import { useAssertStable } from "@/hooks"
import { useQuery } from "@tanstack/react-query"

export const $App = service("App")
    .app({
        services: [$userQuery, req.$defaultUser],
        factory: (initDeps, ctx) =>
            function App() {
                const { userQuery, defaultUser } = useDeps(initDeps)
                const { data: defaultSession } = useQuery(
                    userQuery(defaultUser)
                )
                const [session, setSession] = useState<User | undefined>(
                    undefined
                )
                const assertStableFeed = useAssertStable()
                const assertStableSelectSession = useAssertStable()
                const contextualFeed = ctx($Feed)
                const hiredFeed = contextualFeed.hire($SelectSession)

                const FeedProduct = useAssembleComponent(
                    hiredFeed,
                    index(
                        req.$session.pack([
                            session ?? defaultSession,
                            setSession
                        ])
                    )
                )

                const Feed = assertStableFeed(FeedProduct.unpack())

                const SelectSession = assertStableSelectSession(
                    FeedProduct.deps[$SelectSession.name]
                )

                return (
                    <div className="min-h-screen bg-gray-900 text-white p-6">
                        <div className="max-w-2xl mx-auto">
                            <header className="mb-8">
                                <h1 className="text-3xl font-bold text-center mb-4">
                                    Social Feed Wireframe
                                </h1>
                                <SelectSession />
                            </header>
                            <Feed />
                        </div>
                    </div>
                )
            }
    })
    .preassemble()

import { createContext, useMemo, useState, type ReactNode } from "react"
import { $Feed } from "@/components/feed"
import { $SelectSession } from "@/components/session"
import { req, type Session } from "@/req"
import { $userQuery, type User } from "@/api"
import { tm } from "@marketjs/trademarks"
import { Provide, useDeps } from "@marketjs/react"
import { useQuery } from "@tanstack/react-query"

export const $App = tm("App").service({
    required: [$userQuery, req.$defaultUser, $Feed, $SelectSession],
    context: createContext<() => ReactNode>(() => null),
    factory: (_, ctx) =>
        function App() {
            const { userQuery, defaultUser, Feed, SelectSession } =
                useDeps($App)
            const { data: defaultSession } = useQuery(userQuery(defaultUser))
            const [session, setSession] = useState<User | undefined>(undefined)

            const sessionValue = useMemo<Session>(
                () => [session ?? defaultSession, setSession],
                [session, defaultSession]
            )

            return (
                <Provide
                    supply={ctx($Feed)
                        .hire($SelectSession)
                        .buy({
                            session: req.$session.of(sessionValue)
                        })}
                >
                    {() => (
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
                    )}
                </Provide>
            )
        }
})

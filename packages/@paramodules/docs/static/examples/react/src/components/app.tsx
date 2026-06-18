import { Suspense, useState } from "react"
import { $Feed } from "@/components/feed"
import { $SelectSession } from "@/components/session"
import { type User } from "@/api"
import { ParamsProvider, service, useSupplies } from "@paramodules/react"
import { $userStateContext } from "@/context"
import { index } from "paramodules"

export const $App = service("App").module({
    required: [$Feed, $SelectSession],
    factory: (initSupplies) =>
        function App() {
            const { Feed, SelectSession } = useSupplies($App, initSupplies)
            const userState = useState<User | undefined>(undefined)

            return (
                <ParamsProvider
                    for={$Feed.hire($SelectSession)}
                    params={index($userStateContext.of(userState))}
                >
                    <div className="min-h-screen bg-gray-900 text-white p-6">
                        <div className="max-w-2xl mx-auto">
                            <header className="mb-8">
                                <h1 className="text-3xl font-bold text-center mb-4">
                                    Social Feed Wireframe
                                </h1>
                                <Suspense
                                    fallback={<div>Loading users...</div>}
                                >
                                    <SelectSession />
                                </Suspense>
                            </header>
                            <Suspense fallback={<div>Loading feed...</div>}>
                                <Feed />
                            </Suspense>
                        </div>
                    </div>
                </ParamsProvider>
            )
        }
})

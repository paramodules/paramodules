import { $selectSessionJsx } from "@/jsx/session"
import { AsyncJSX } from "@/utils"
import { service } from "paramodules"
import { Suspense } from "react"
import { $feedJsx } from "@/jsx/feed"

export const $appJsx = service("appJsx").module({
    required: [$selectSessionJsx, $feedJsx],
    factory: ({ selectSessionJsx, feedJsx }) => {
        return (
            <div className="min-h-screen bg-gray-900 text-white p-6">
                <div className="max-w-2xl mx-auto">
                    <header className="mb-8">
                        <h1 className="text-3xl font-bold text-center mb-4">
                            Social Feed Wireframe
                        </h1>
                        <Suspense
                            fallback={
                                <div>
                                    <p>Fake loading users... (3s)</p>
                                    <p className="text-xs text-gray-500">
                                        Refresh the page when done, then it'll
                                        be instant thanks to caching
                                    </p>
                                </div>
                            }
                        >
                            <AsyncJSX jsx={selectSessionJsx} />
                        </Suspense>
                    </header>
                    <Suspense
                        fallback={
                            <div>
                                <p>Fake loading feed... (3s)</p>
                                <p className="text-xs text-gray-500">
                                    Refresh the page when done, then it'll be
                                    instant thanks to caching
                                </p>
                            </div>
                        }
                    >
                        <AsyncJSX jsx={feedJsx} />
                    </Suspense>
                </div>
            </div>
        )
    }
})

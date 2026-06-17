import { service, useSupplies } from "@paramodules/react"
import { $usersPromise } from "@/api"
import { use } from "react"
import { $currentPost, $userStateContext } from "@/context"

export const $SelectSession = service("SelectSession").module({
    required: [$usersPromise, $currentPost, $userStateContext],
    factory: (initSupplies) =>
        function SelectSession() {
            const { usersPromise, currentPost, userStateContext } = useSupplies(
                $SelectSession,
                initSupplies
            )

            const users = use(usersPromise)
            const [userState, setUserState] = userStateContext
            const user = userState ?? users[0]

            return (
                <div className="flex flex-col justify-center items-center gap-2">
                    <div className="flex justify-center items-center gap-4">
                        <span className="text-sm text-gray-400">
                            Session: {user.id}
                        </span>
                        <div className="flex gap-2">
                            {users.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => setUserState(u)}
                                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                        user?.id === u.id ?
                                            "bg-blue-600 text-white"
                                        :   "bg-gray-700 text-gray-300 hover:bg-gray-600"
                                    }`}
                                >
                                    {u.id}
                                </button>
                            ))}
                        </div>
                    </div>
                    {currentPost && (
                        <p className="text-xs text-gray-500">
                            Silly and pointless session switcher to show context
                            switching
                        </p>
                    )}
                </div>
            )
        }
})

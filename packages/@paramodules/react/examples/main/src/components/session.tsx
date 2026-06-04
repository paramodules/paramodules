import { createContext } from "react"
import { $usersQuery } from "@/api"
import { req } from "@/req"
import { useQuery } from "@tanstack/react-query"
import { useDeps } from "@marketjs/react"
import { tm } from "@marketjs/trademarks"

function SelectSession() {
    const { usersQuery, session, post } = useDeps($SelectSession)
    const [sessionUser, setSession] = session ?? [undefined, () => {}]
    const { data: users } = useQuery(usersQuery)

    if (!users || !sessionUser) {
        return <div>Loading users...</div>
    }
    return (
        <div className="flex flex-col justify-center items-center gap-2">
            <div className="flex justify-center items-center gap-4">
                <span className="text-sm text-gray-400">
                    Session: {sessionUser.id}
                </span>
                <div className="flex gap-2">
                    {users.map((user) => (
                        <button
                            key={user.id}
                            onClick={() => setSession(user)}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                sessionUser.id === user.id ?
                                    "bg-blue-600 text-white"
                                :   "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                        >
                            {user.id}
                        </button>
                    ))}
                </div>
            </div>
            {post && (
                <p className="text-xs text-gray-500">
                    Silly and pointless session switcher to show context
                    switching
                </p>
            )}
        </div>
    )
}

export const $SelectSession = tm("SelectSession").service({
    required: [$usersQuery],
    optionals: [req.$session, req.$post],
    context: createContext(SelectSession),
    factory: () => SelectSession
})

import { service } from "paramodules"
import { $users } from "@/api"
import { $post, $userState } from "@/params"
import { memoryCaching } from "@/cache"
import { startTransition } from "react"

export const $selectSessionJsx = service("selectSessionJsx")
    .module({
        required: [$users, $userState],
        optionals: [$post],
        factory: async ({ users: usersPromise, post, userState }) => {
            const users = await usersPromise
            const [userFromState, setUser] = userState
            const user = userFromState ?? users[0]

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
                                    onClick={() =>
                                        startTransition(() => setUser(u))
                                    }
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
                    {post && (
                        <p className="text-xs text-gray-500">
                            Silly and pointless session switcher to show context
                            switching
                        </p>
                    )}
                </div>
            )
        }
    })
    .caching(memoryCaching)

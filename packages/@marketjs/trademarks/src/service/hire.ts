import { team } from "#service/main"
import type { ServiceGuard } from "#types/guards"
import type { Service } from "#types/public"
import type { Supply, UnknownService, UnknownTM } from "#types/public"
import type { SupplyDeps } from "#types/records"
import type { MergeStringTuples } from "#types/utils"
import type { Merge } from "#utils"
import { assertServices } from "#validation"

/**
 * Hires additional services into the dependency chain of this app service.
 * This allows replacing or adding services composition-root style for testing,
 * mocking, or batch assembly. Hired services override services with matching
 * names in the transitive dependency tree.
 *
 * @param hiredServices - App services to hire (replace/add to the team)
 * @returns A new app service with the hired services merged into the team
 * @public
 */
export function Hire() {
    return function hire<
        THIS extends Omit<UnknownService, "_hired"> & {
            _hired: string[]
        },
        HIRED extends UnknownService[] = []
    >(
        this: THIS,
        ...hired: [...HIRED]
    ): ServiceGuard<
        Service<
            THIS["name"],
            THIS["_type"],
            THIS["_optionalKeys"],
            THIS["_known"],
            Merge<
                {
                    [SERVICE in HIRED[number] as SERVICE["name"]]?: Supply<SERVICE>
                },
                Merge<
                    Omit<
                        THIS["_toSpecify"],
                        keyof HIRED[number]["_oldToSpecify"]
                    >,
                    HIRED[number]["_toSpecify"]
                >
            >,
            MergeStringTuples<
                THIS["_hired"],
                {
                    [K in keyof HIRED]: HIRED[K]["name"]
                }
            >,
            THIS["_mock"]
        >,
        HIRED
    > {
        assertServices(this.name, hired, true)
        const mergedServices = [
            ...this._required.filter(
                (oldTM) => !hired.some((newTM) => newTM.name === oldTM.name)
            ),
            ...hired
        ]

        const mergedHired = [
            ...this._hired.filter(
                (oldName) =>
                    !hired.some((newService) => newService.name === oldName)
            ),
            ...hired.map((newService) => newService.name)
        ] as MergeStringTuples<
            THIS["_hired"],
            {
                [K in keyof HIRED]: HIRED[K]["name"]
            }
        >

        const _toSpecify = null as unknown as Merge<
            {
                [SERVICE in HIRED[number] as SERVICE["name"]]?: Supply<SERVICE>
            },
            Merge<
                Omit<THIS["_toSpecify"], keyof HIRED[number]["_oldToSpecify"]>,
                HIRED[number]["_toSpecify"]
            >
        >
        const _deps = null as unknown as SupplyDeps<
            typeof _toSpecify,
            THIS["_optionalKeys"]
        >

        return {
            ...this,
            _required: mergedServices,
            _hired: mergedHired,
            _team: team(this.name, mergedServices, this._optionals),
            _toSpecify: _toSpecify,
            _deps,
            _known: {
                ...this._known,
                ...hired
                    .map((service) => service._known)
                    .reduce((acc, known) => ({ ...acc, ...known }), {})
            },
            _oldToSpecify: _toSpecify,
            _oldDeps: _deps,
            _mock: false as const
        } satisfies Service<
            THIS["name"],
            THIS["_type"],
            THIS["_optionalKeys"],
            THIS["_known"],
            Merge<
                {
                    [SERVICE in HIRED[number] as SERVICE["name"]]?: Supply<SERVICE>
                },
                Merge<
                    Omit<
                        THIS["_toSpecify"],
                        keyof HIRED[number]["_oldToSpecify"]
                    >,
                    HIRED[number]["_toSpecify"]
                >
            >,
            MergeStringTuples<
                THIS["_hired"],
                {
                    [K in keyof HIRED]: HIRED[K]["name"]
                }
            >,
            THIS["_mock"]
        > as any
    }
}

import { team } from "#service/main"
import type { ModuleGuard } from "#types/guards"
import type { Module } from "#types/public"
import type { Supplier, UnknownModule } from "#types/public"
import type { Supplies } from "#types/records"
import type { MergeStringTuples } from "#types/utils"
import type { Merge } from "#utils"
import { assertModules } from "#validation"

/**
 * Hires additional modules into the dependency chain of this module.
 * This allows replacing or adding modules composition-root style for testing,
 * mocking, or batching. Hired modules override modules with matching
 * names in the transitive dependency tree.
 *
 * @param hired - Modules to hire (replace/add to the team)
 * @returns A new module with the hired modules merged into the team
 * @public
 */
export function Hire() {
    return function hire<
        THIS extends Omit<UnknownModule, "_hired"> & {
            _hired: string[]
        },
        HIRED extends UnknownModule[] = []
    >(
        this: THIS,
        ...hired: [...HIRED]
    ): ModuleGuard<
        Module<
            THIS["tm"],
            THIS["_type"],
            THIS["_optionalKeys"],
            THIS["_caller"],
            Merge<
                {
                    [SERVICE in HIRED[number] as SERVICE["tm"]]?: Supplier<SERVICE>
                },
                Merge<
                    Omit<THIS["_reqType"], keyof HIRED[number]["_oldReqType"]>,
                    HIRED[number]["_reqType"]
                >
            >,
            MergeStringTuples<
                THIS["_hired"],
                {
                    [K in keyof HIRED]: HIRED[K]["tm"]
                }
            >,
            THIS["_mock"]
        >,
        HIRED
    > {
        assertModules(this.tm, hired, true)
        const mergedServices = [
            ...this._required.filter(
                (oldService) =>
                    !hired.some((newService) => newService.tm === oldService.tm)
            ),
            ...hired
        ]

        const mergedHired = [
            ...this._hired.filter(
                (oldTM) => !hired.some((newService) => newService.tm === oldTM)
            ),
            ...hired.map((newService) => newService.tm)
        ] as MergeStringTuples<
            THIS["_hired"],
            {
                [K in keyof HIRED]: HIRED[K]["tm"]
            }
        >

        const _reqType = null as unknown as Merge<
            {
                [SERVICE in HIRED[number] as SERVICE["tm"]]?: Supplier<SERVICE>
            },
            Merge<
                Omit<THIS["_reqType"], keyof HIRED[number]["_oldReqType"]>,
                HIRED[number]["_reqType"]
            >
        >
        const _suppliesType = null as unknown as Supplies<
            typeof _reqType,
            THIS["_optionalKeys"]
        >

        return {
            ...this,
            _required: mergedServices,
            _hired: mergedHired,
            _team: team(this.tm, mergedServices, this._optionals),
            _reqType,
            _suppliesType,
            _caller: {
                ...this._caller,
                market: {
                    ...this._caller?.market,
                    ...hired
                        .map((module) => module._caller?.market ?? {})
                        .reduce((acc, market) => ({ ...acc, ...market }), {})
                }
            },
            _oldReqType: _reqType,
            _oldSuppliesType: _suppliesType,
            _mock: false as const
        } satisfies Module<
            THIS["tm"],
            THIS["_type"],
            THIS["_optionalKeys"],
            THIS["_caller"],
            Merge<
                {
                    [SERVICE in HIRED[number] as SERVICE["tm"]]?: Supplier<SERVICE>
                },
                Merge<
                    Omit<THIS["_reqType"], keyof HIRED[number]["_oldReqType"]>,
                    HIRED[number]["_reqType"]
                >
            >,
            MergeStringTuples<
                THIS["_hired"],
                {
                    [K in keyof HIRED]: HIRED[K]["tm"]
                }
            >,
            THIS["_mock"]
        > as any
    }
}

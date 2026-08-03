import "@/pages/stats/StatsPage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import { useEffect, useState } from "react";
import type {TrackAction, TrackActionType} from "@/models/TrackAction.tsx";
import type {Page} from "@/models/Page.tsx";
import {
    getCourseActions,
    getCourseActionSum,
    getGlobalActions, getGlobalActionSum,
    getUserActions,
    getUserActionSum
} from "@/services/statisticsService.tsx";
import ActionChart from "@/components/stats/ActionChart.tsx";
import CaffeineDailyChart from "@/components/caffeine/CaffeineDailyChart.tsx";
import FilterDropdown from "@/components/ui/FilterDropdown.tsx";
import type {CaffeineEntry} from "@/models/CaffeineEntry.tsx";
import {
    getCourseCaffeineAverage,
    getCourseCaffeineEntries,
    getGlobalCaffeineAverage,
    getGlobalCaffeineEntries,
    getUserCaffeineAverage,
    getUserCaffeineEntries,
} from "@/services/caffeineService.tsx";

type ActionSumMap = Partial<Record<TrackActionType, number>>;
type StatsFilter = TrackActionType | "CAFFEINE";

const ALL_ACTIONS: TrackActionType[] = [
    "EXMATRICULATED",
    "GAME_PLAYED",
    "GAME_SUGGESTED",
    "IDEA_SUBMITTED",
    "LOGGED_IN",
    "PRESENTATION_GAME_PLAYED",
];

const ALL_FILTERS: StatsFilter[] = [...ALL_ACTIONS, "CAFFEINE"];

const translateFilter = (filter: StatsFilter) => {
    switch (filter) {
        case "EXMATRICULATED": return "Anzahl Exmatrikulationen"
        case "GAME_PLAYED": return "Spiele gespielt"
        case "GAME_SUGGESTED": return "Spiele Vorgeschlagen"
        case "IDEA_SUBMITTED": return "Feedback abgegeben"
        case "LOGGED_IN": return "Anzahl Lecture-Survival-Kit geöffnet"
        case "PRESENTATION_GAME_PLAYED": return "Präsi-Spiel gespielt"
        case "CAFFEINE": return "Durchschnittliche Koffein-Dosis"
    }
}

const translateFilterReverse = (label: string): StatsFilter | undefined => {
    return ALL_FILTERS.find((filter) => translateFilter(filter) === label);
};

const StatsPage = () => {
    const [userActions, setUserActions] = useState<TrackAction[]>([]);
    const [courseActions, setCourseActions] = useState<TrackAction[]>([]);
    const [globalActions, setGlobalActions] = useState<TrackAction[]>([]);

    const [userActionSums, setUserActionSums] = useState<ActionSumMap>({});
    const [courseActionSums, setCourseActionSums] = useState<ActionSumMap>({});
    const [globalActionSums, setGlobalActionSums] = useState<ActionSumMap>({});

    const [userCaffeine, setUserCaffeine] = useState<CaffeineEntry[]>([]);
    const [courseCaffeine, setCourseCaffeine] = useState<CaffeineEntry[]>([]);
    const [globalCaffeine, setGlobalCaffeine] = useState<CaffeineEntry[]>([]);
    const [userCaffeineAvg, setUserCaffeineAvg] = useState(0);
    const [courseCaffeineAvg, setCourseCaffeineAvg] = useState(0);
    const [globalCaffeineAvg, setGlobalCaffeineAvg] = useState(0);

    const [selectedFilter, setSelectedFilter] = useState<StatsFilter[]>(["EXMATRICULATED"]);

    useEffect(() => {
        const fetchAllPages = async (
            fetcher: (action: TrackActionType, continuation?: string) => Promise<Page<TrackAction>>,
            action: TrackActionType
        ): Promise<TrackAction[]> => {
            let continuation: string | undefined = undefined;
            let result: TrackAction[] = [];

            do {
                const page: Page<TrackAction> = await fetcher(action, continuation);
                result = [...result, ...page.data];
                continuation = page.continuation ?? undefined;
            } while (continuation);

            return result;
        };

        const fetchUserActions = async () => {
            const results = await Promise.all(
                ALL_ACTIONS.map((action) => fetchAllPages(getUserActions, action))
            );
            setUserActions(results.flat());
        };

        const fetchCourseActions = async () => {
            const results = await Promise.all(
                ALL_ACTIONS.map((action) => fetchAllPages(getCourseActions, action))
            );
            setCourseActions(results.flat());
        };

        const fetchGlobalActions = async () => {
            const results = await Promise.all(
                ALL_ACTIONS.map((action) => fetchAllPages(getGlobalActions, action))
            );
            setGlobalActions(results.flat());
        };

        const fetchUserActionSums = async () => {
            const entries = await Promise.all(
                ALL_ACTIONS.map(async (action) => [action, await getUserActionSum(action)] as const)
            );
            setUserActionSums(Object.fromEntries(entries));
        };

        const fetchCourseActionSums = async () => {
            const entries = await Promise.all(
                ALL_ACTIONS.map(async (action) => [action, await getCourseActionSum(action)] as const)
            );
            setCourseActionSums(Object.fromEntries(entries));
        };

        const fetchGlobalActionSums = async () => {
            const entries = await Promise.all(
                ALL_ACTIONS.map(async (action) => [action, await getGlobalActionSum(action)] as const)
            );
            setGlobalActionSums(Object.fromEntries(entries));
        };

        const fetchCaffeine = async () => {
            if (getUserRole() !== "GUEST") {
                setUserCaffeine(await getUserCaffeineEntries());
                setCourseCaffeine(await getCourseCaffeineEntries());
                setUserCaffeineAvg(await getUserCaffeineAverage());
                setCourseCaffeineAvg(await getCourseCaffeineAverage());
            }
            setGlobalCaffeine(await getGlobalCaffeineEntries());
            setGlobalCaffeineAvg(await getGlobalCaffeineAverage());
        };

        if (getUserRole() !== "GUEST") fetchUserActions();
        if (getUserRole() !== "GUEST") fetchCourseActions();
        fetchGlobalActions();
        if (getUserRole() !== "GUEST") fetchUserActionSums();
        if (getUserRole() !== "GUEST") fetchCourseActionSums();
        fetchGlobalActionSums();
        fetchCaffeine();
    }, []);

    const onFilterChange = (items: string[]) => {
        const filters = items
            .map((label) => translateFilterReverse(label))
            .filter((filter): filter is StatsFilter => filter !== undefined);

        setSelectedFilter(filters);
    };

    const showAction = (action: TrackActionType) =>
        selectedFilter.includes(action);

    const showCaffeine = selectedFilter.includes("CAFFEINE");

    return <div className="survival-kit-page">
        <div className="stats-page">
            <div className="stats-page-header">
                <FilterDropdown
                    values={ALL_FILTERS.map(translateFilter)}
                    selectedItems={selectedFilter.map(translateFilter)}
                    returnSelected={false}
                    onChange={onFilterChange}
                    placeholder="Statistiken filtern"
                />
            </div>
            { getUserRole() !== "GUEST" && <SectionHeading heading={"Persönliche Statistiken"} subheading={"Statistiken deines persönlichen Profils"} centered={false} /> }
            <div className="stats-page-action-charts">
                {getUserRole() !== "GUEST" && showAction("EXMATRICULATED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "EXMATRICULATED")}
                        title={`${translateFilter("EXMATRICULATED")} (${userActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showAction("GAME_PLAYED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "GAME_PLAYED")}
                        title={`${translateFilter("GAME_PLAYED")} (${userActionSums["GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showAction("GAME_SUGGESTED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "GAME_SUGGESTED")}
                        title={`${translateFilter("GAME_SUGGESTED")} (${userActionSums["GAME_SUGGESTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showAction("IDEA_SUBMITTED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "IDEA_SUBMITTED")}
                        title={`${translateFilter("IDEA_SUBMITTED")} (${userActionSums["IDEA_SUBMITTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showAction("LOGGED_IN") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "LOGGED_IN")}
                        title={`${translateFilter("LOGGED_IN")} (${userActionSums["LOGGED_IN"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showAction("PRESENTATION_GAME_PLAYED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "PRESENTATION_GAME_PLAYED")}
                        title={`${translateFilter("PRESENTATION_GAME_PLAYED")} (${userActionSums["PRESENTATION_GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showCaffeine && (
                    <CaffeineDailyChart
                        entries={userCaffeine}
                        title={`${translateFilter("CAFFEINE")} (Ø ${Math.round(userCaffeineAvg)} mg in den letzten 7 Tagen)`}
                    />
                )}
            </div>
            { getUserRole() !== "GUEST" && selectedFilter.length === 0 && <div className="stats-page-no-filter-info">Keine Statistiken die deinem Filter entsprechen.</div> }

            { getUserRole() !== "GUEST" && (courseActions.some((a) => selectedFilter.includes(a.type)) || showCaffeine) && <SectionHeading heading={"Kurs-Statistiken"} subheading={"Statistiken, deines Kurses"} centered={false} /> }
            <div className="stats-page-action-charts">
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && showAction("EXMATRICULATED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "EXMATRICULATED")}
                        title={`${translateFilter("EXMATRICULATED")} (${courseActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && showAction("GAME_PLAYED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "GAME_PLAYED")}
                        title={`${translateFilter("GAME_PLAYED")} (${courseActionSums["GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && showAction("GAME_SUGGESTED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "GAME_SUGGESTED")}
                        title={`${translateFilter("GAME_SUGGESTED")} (${courseActionSums["GAME_SUGGESTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && showAction("IDEA_SUBMITTED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "IDEA_SUBMITTED")}
                        title={`${translateFilter("IDEA_SUBMITTED")} (${courseActionSums["IDEA_SUBMITTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && showAction("LOGGED_IN") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "LOGGED_IN")}
                        title={`${translateFilter("LOGGED_IN")} (${courseActionSums["LOGGED_IN"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && showAction("PRESENTATION_GAME_PLAYED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "PRESENTATION_GAME_PLAYED")}
                        title={`${translateFilter("PRESENTATION_GAME_PLAYED")} (${courseActionSums["PRESENTATION_GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && showCaffeine && (
                    <CaffeineDailyChart
                        entries={courseCaffeine}
                        title={`${translateFilter("CAFFEINE")} (Ø ${Math.round(courseCaffeineAvg)} mg in den letzten 7 Tagen)`}
                    />
                )}
            </div>

            <SectionHeading heading={"Globale Statistiken"} subheading={"Statistiken aller Benutzer des Survival Kits"} centered={false} />
            <div className="stats-page-action-charts">
                {showAction("EXMATRICULATED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "EXMATRICULATED")}
                        title={`${translateFilter("EXMATRICULATED")} (${globalActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {showAction("GAME_PLAYED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "GAME_PLAYED")}
                        title={`${translateFilter("GAME_PLAYED")} (${globalActionSums["GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {showAction("GAME_SUGGESTED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "GAME_SUGGESTED")}
                        title={`${translateFilter("GAME_SUGGESTED")} (${globalActionSums["GAME_SUGGESTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {showAction("IDEA_SUBMITTED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "IDEA_SUBMITTED")}
                        title={`${translateFilter("IDEA_SUBMITTED")} (${globalActionSums["IDEA_SUBMITTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {showAction("LOGGED_IN") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "LOGGED_IN")}
                        title={`${translateFilter("LOGGED_IN")} (${globalActionSums["LOGGED_IN"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {showAction("PRESENTATION_GAME_PLAYED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "PRESENTATION_GAME_PLAYED")}
                        title={`${translateFilter("PRESENTATION_GAME_PLAYED")} (${globalActionSums["PRESENTATION_GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {showCaffeine && (
                    <CaffeineDailyChart
                        entries={globalCaffeine}
                        title={`${translateFilter("CAFFEINE")} (Ø ${Math.round(globalCaffeineAvg)} mg in den letzten 7 Tagen)`}
                    />
                )}
            </div>
            { selectedFilter.length === 0 && <div className="stats-page-no-filter-info">Keine Statistiken die deinem Filter entsprechen.</div> }
            { getUserRole() === "GUEST" && <div className="stats-page-no-filter-info">Melde dich an um deine persönlichen Statistiken zu sehen</div> }
        </div>
    </div>
}

export default StatsPage;

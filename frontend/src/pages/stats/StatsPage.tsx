import './StatsPage.css';
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import {getUserRole} from "../../services/tokenService.tsx";
import Footer from "../../components/Footer.tsx";
import { useEffect, useState } from "react";
import type {TrackAction, TrackActionType} from "../../models/TrackAction.tsx";
import type {Page} from "../../models/Page.tsx";
import {
    getCourseActions,
    getCourseActionSum,
    getGlobalActions, getGlobalActionSum,
    getUserActions,
    getUserActionSum
} from "../../services/staticsService.tsx";
import ActionChart from "../../components/ActionChart.tsx";
import FilterDropdown from "../../components/shared/FilterDropdown.tsx";

type ActionSumMap = Partial<Record<TrackActionType, number>>;

const ALL_ACTIONS: TrackActionType[] = [
    "EXMATRICULATED",
    "GAME_PLAYED",
    "GAME_SUGGESTED",
    "IDEA_SUBMITTED",
    "LOGGED_IN",
];

const translateAction = (action: TrackActionType) => {
    switch (action) {
        case "EXMATRICULATED": return "Anzahl Exmatrikulationen"
        case "GAME_PLAYED": return "Spiele gespielt"
        case "GAME_SUGGESTED": return "Spiele Vorgeschlagen"
        case "IDEA_SUBMITTED": return "Feedback abgegeben"
        case "LOGGED_IN": return "Anzahl Lecture-Survival-Kit geöffnet"
    }
}

const translateActionReverse = (label: string): TrackActionType | undefined => {
    return ALL_ACTIONS.find((action) => translateAction(action) === label);
};

const StatsPage = () => {
    const [userActions, setUserActions] = useState<TrackAction[]>([]);
    const [courseActions, setCourseActions] = useState<TrackAction[]>([]);
    const [globalActions, setGlobalActions] = useState<TrackAction[]>([]);

    const [userActionSums, setUserActionSums] = useState<ActionSumMap>({});
    const [courseActionSums, setCourseActionSums] = useState<ActionSumMap>({});
    const [globalActionSums, setGlobalActionSums] = useState<ActionSumMap>({});

    const [selectedFilter, setSelectedFilter] = useState<TrackActionType[]>(["EXMATRICULATED"]);

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

        if (getUserRole() !== "GUEST") fetchUserActions();
        if (getUserRole() !== "GUEST") fetchCourseActions();
        fetchGlobalActions();
        if (getUserRole() !== "GUEST") fetchUserActionSums();
        if (getUserRole() !== "GUEST") fetchCourseActionSums();
        fetchGlobalActionSums();
    }, []);

    const onFilterChange = (items: string[]) => {
        const actions = items
            .map((label) => translateActionReverse(label))
            .filter((action): action is TrackActionType => action !== undefined);

        setSelectedFilter(actions);
    };

    return <div className="survival-kit-page">
        <div className="stats-page">
            <div className="stats-page-header">
                <FilterDropdown
                    values={ALL_ACTIONS.map(translateAction)}
                    selectedItems={selectedFilter.map(translateAction)}
                    returnSelected={false}
                    onChange={onFilterChange}
                    placeholder="Statistiken filtern"
                />
            </div>
            { getUserRole() !== "GUEST" && <SectionHeading heading={"Persönliche Statistiken"} subheading={"Statistiken deines persönlichen Profils"} centered={false} /> }
            <div className="stats-page-action-charts">
                {getUserRole() !== "GUEST" && selectedFilter.includes("EXMATRICULATED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "EXMATRICULATED")}
                        title={`${translateAction("EXMATRICULATED")} (${userActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && selectedFilter.includes("GAME_PLAYED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "GAME_PLAYED")}
                        title={`${translateAction("GAME_PLAYED")} (${userActionSums["GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && selectedFilter.includes("GAME_SUGGESTED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "GAME_SUGGESTED")}
                        title={`${translateAction("GAME_SUGGESTED")} (${userActionSums["GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && selectedFilter.includes("IDEA_SUBMITTED") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "IDEA_SUBMITTED")}
                        title={`${translateAction("IDEA_SUBMITTED")} (${userActionSums["IDEA_SUBMITTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && selectedFilter.includes("LOGGED_IN") && (
                    <ActionChart
                        actions={userActions.filter((a) => a.type === "LOGGED_IN")}
                        title={`${translateAction("LOGGED_IN")} (${userActionSums["LOGGED_IN"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
            </div>
            { getUserRole() !== "GUEST" && selectedFilter.length === 0 && <div className="stats-page-no-filter-info">Keine Statistiken die deinem Filter entsprechen.</div> }

            { getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && <SectionHeading heading={"Kurs-Statistiken"} subheading={"Statistiken, deines Kurses"} centered={false} /> }
            <div className="stats-page-action-charts">
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && selectedFilter.includes("EXMATRICULATED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "EXMATRICULATED")}
                        title={`${translateAction("EXMATRICULATED")} (${courseActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && selectedFilter.includes("GAME_PLAYED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "GAME_PLAYED")}
                        title={`${translateAction("GAME_PLAYED")} (${courseActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && selectedFilter.includes("GAME_SUGGESTED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "GAME_SUGGESTED")}
                        title={`${translateAction("GAME_SUGGESTED")} (${courseActionSums["GAME_SUGGESTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && selectedFilter.includes("IDEA_SUBMITTED") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "IDEA_SUBMITTED")}
                        title={`${translateAction("IDEA_SUBMITTED")} (${courseActionSums["IDEA_SUBMITTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && selectedFilter.includes("LOGGED_IN") && (
                    <ActionChart
                        actions={courseActions.filter((a) => a.type === "LOGGED_IN")}
                        title={`${translateAction("LOGGED_IN")} (${courseActionSums["LOGGED_IN"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
            </div>
            { getUserRole() !== "GUEST" && courseActions.some((a) => selectedFilter.includes(a.type)) && selectedFilter.length === 0 && <div className="stats-page-no-filter-info">Keine Statistiken die deinem Filter entsprechen.</div> }

            <SectionHeading heading={"Globale Statistiken"} subheading={"Statistiken aller Benutzer des Survival Kits"} centered={false} />
            <div className="stats-page-action-charts">
                {selectedFilter.includes("EXMATRICULATED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "EXMATRICULATED")}
                        title={`${translateAction("EXMATRICULATED")} (${globalActionSums["EXMATRICULATED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {selectedFilter.includes("GAME_PLAYED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "GAME_PLAYED")}
                        title={`${translateAction("GAME_PLAYED")} (${globalActionSums["GAME_PLAYED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {selectedFilter.includes("GAME_SUGGESTED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "GAME_SUGGESTED")}
                        title={`${translateAction("GAME_SUGGESTED")} (${globalActionSums["GAME_SUGGESTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {selectedFilter.includes("IDEA_SUBMITTED") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "IDEA_SUBMITTED")}
                        title={`${translateAction("IDEA_SUBMITTED")} (${globalActionSums["IDEA_SUBMITTED"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
                {selectedFilter.includes("LOGGED_IN") && (
                    <ActionChart
                        actions={globalActions.filter((a) => a.type === "LOGGED_IN")}
                        title={`${translateAction("LOGGED_IN")} (${globalActionSums["LOGGED_IN"] ?? 0} in den letzten 7 Tagen)`}
                    />
                )}
            </div>
            { selectedFilter.length === 0 && <div className="stats-page-no-filter-info">Keine Statistiken die deinem Filter entsprechen.</div> }
            { getUserRole() === "GUEST" && <div className="stats-page-no-filter-info">Melde dich an um deine persönlichen Statistiken zu sehen</div> }
        </div>
        <Footer />
    </div>
}

export default StatsPage;
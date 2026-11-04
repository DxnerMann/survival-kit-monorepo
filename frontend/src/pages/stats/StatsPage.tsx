import "@/pages/stats/StatsPage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {getUserRole} from "@/services/tokenService.tsx";
import {getUsername} from "@/services/userService.tsx";
import { useEffect, useState } from "react";
import type {TrackAction, TrackActionType} from "@/models/TrackAction.tsx";
import type {Page} from "@/models/Page.tsx";
import {
    getCourseActions,
    getGlobalActions,
    getUserActions,
} from "@/services/statisticsService.tsx";
import ActionChart from "@/components/stats/ActionChart.tsx";
import CaffeineDailyChart from "@/components/caffeine/CaffeineDailyChart.tsx";
import FilterDropdown from "@/components/ui/FilterDropdown.tsx";
import type {CaffeineEntry} from "@/models/CaffeineEntry.tsx";
import {
    getCourseCaffeineEntries,
    getGlobalCaffeineEntries,
    getUserCaffeineEntries,
} from "@/services/caffeineService.tsx";

type CaffeineStat = "CAFFEINE_SUM" | "CAFFEINE_AVG";
type VisibleAction = Exclude<TrackActionType, "LOGGED_IN">;
type StatsFilter = VisibleAction | CaffeineStat;
type StatsScope = "personal" | "course" | "global";

const ALL_ACTIONS: VisibleAction[] = [
    "EXMATRICULATED",
    "GAME_PLAYED",
    "GAME_SUGGESTED",
    "IDEA_SUBMITTED",
    "MEME_UPLOADED",
    "PRESENTATION_GAME_PLAYED",
    "ROOMS_SEARCHED",
];

const ALL_FILTERS: StatsFilter[] = [...ALL_ACTIONS, "CAFFEINE_SUM", "CAFFEINE_AVG"];

const translateFilter = (filter: StatsFilter) => {
    switch (filter) {
        case "EXMATRICULATED": return "Simulierte Exmatrikulationen"
        case "GAME_PLAYED": return "Browserspiele geöffnet"
        case "GAME_SUGGESTED": return "Spielvorschläge"
        case "IDEA_SUBMITTED": return "Feedback abgegeben"
        case "MEME_UPLOADED": return "Memes hochgeladen"
        case "PRESENTATION_GAME_PLAYED": return "Präsi-Spiel-Teilnahmen"
        case "ROOMS_SEARCHED": return "Raumsuchen"
        case "CAFFEINE_SUM": return "Koffein-Summe"
        case "CAFFEINE_AVG": return "Koffein-Durchschnitt"
    }
}

const translateFilterReverse = (label: string): StatsFilter | undefined => {
    return ALL_FILTERS.find((filter) => translateFilter(filter) === label);
};

const storageKey = () => `lsk-stats-view:${getUsername() || "guest"}`;

const isStatsFilter = (value: unknown): value is StatsFilter =>
    typeof value === "string" && (ALL_FILTERS as string[]).includes(value);

const isStatsScope = (value: unknown): value is StatsScope =>
    value === "personal" || value === "course" || value === "global";

const readStoredView = (): {filters: StatsFilter[]; scope: StatsScope} => {
    const fallback = {filters: [...ALL_FILTERS], scope: "personal" as StatsScope};
    try {
        const raw = localStorage.getItem(storageKey());
        if (!raw) {
            return fallback;
        }
        const parsed = JSON.parse(raw) as {filters?: unknown; scope?: unknown};
        const filters = Array.isArray(parsed.filters)
            ? parsed.filters.filter(isStatsFilter)
            : fallback.filters;
        return {
            filters,
            scope: isStatsScope(parsed.scope) ? parsed.scope : fallback.scope,
        };
    } catch {
        return fallback;
    }
};

const SCOPE_COPY: Record<StatsScope, {heading: string; hint: string}> = {
    personal: {
        heading: "Persönliche Statistiken",
        hint: "Nur deine eigenen Aktionen",
    },
    course: {
        heading: "Kurs-Statistiken",
        hint: "Zusammengezählt für deinen Kurs",
    },
    global: {
        heading: "Globale Statistiken",
        hint: "Alle Benutzer des Survival Kits",
    },
};

const StatsPage = () => {
    const isGuest = getUserRole() === "GUEST";
    const [userActions, setUserActions] = useState<TrackAction[]>([]);
    const [courseActions, setCourseActions] = useState<TrackAction[]>([]);
    const [globalActions, setGlobalActions] = useState<TrackAction[]>([]);

    const [userCaffeine, setUserCaffeine] = useState<CaffeineEntry[]>([]);
    const [courseCaffeine, setCourseCaffeine] = useState<CaffeineEntry[]>([]);
    const [globalCaffeine, setGlobalCaffeine] = useState<CaffeineEntry[]>([]);

    const [selectedFilter, setSelectedFilter] = useState<StatsFilter[]>(() => readStoredView().filters);
    const [scope, setScope] = useState<StatsScope>(() => (getUserRole() === "GUEST" ? "global" : readStoredView().scope));

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

        const fetchCaffeine = async () => {
            if (getUserRole() !== "GUEST") {
                setUserCaffeine(await getUserCaffeineEntries());
                setCourseCaffeine(await getCourseCaffeineEntries());
            }
            setGlobalCaffeine(await getGlobalCaffeineEntries());
        };

        if (!isGuest) fetchUserActions();
        if (!isGuest) fetchCourseActions();
        fetchGlobalActions();
        fetchCaffeine();
    }, [isGuest]);

    const persistView = (filters: StatsFilter[], nextScope: StatsScope) => {
        localStorage.setItem(storageKey(), JSON.stringify({filters, scope: nextScope}));
    };

    const onFilterChange = (items: string[]) => {
        const filters = items
            .map((label) => translateFilterReverse(label))
            .filter((filter): filter is StatsFilter => filter !== undefined);

        setSelectedFilter(filters);
        persistView(filters, scope);
    };

    const selectScope = (nextScope: StatsScope) => {
        setScope(nextScope);
        persistView(selectedFilter, nextScope);
    };

    const showAction = (action: VisibleAction) => selectedFilter.includes(action);

    const actionCharts = (actions: TrackAction[]) =>
        ALL_ACTIONS.filter(showAction).map(action => (
            <ActionChart
                key={action}
                actions={actions.filter(item => item.type === action)}
                label={translateFilter(action)}
            />
        ));

    const showCaffeineSum = selectedFilter.includes("CAFFEINE_SUM");
    const showCaffeineAvg = selectedFilter.includes("CAFFEINE_AVG");

    const caffeineCharts = (entries: CaffeineEntry[], perPerson: boolean) => (
        <>
            {showCaffeineSum && <CaffeineDailyChart key="sum" entries={entries} mode="sum" />}
            {showCaffeineAvg && (
                <CaffeineDailyChart
                    key="avg"
                    entries={entries}
                    mode={perPerson ? "per-person" : "daily-average"}
                />
            )}
        </>
    );

    const activeScope: StatsScope = isGuest ? "global" : scope;
    const scopeCopy = SCOPE_COPY[activeScope];
    const scopeActions = activeScope === "personal" ? userActions : activeScope === "course" ? courseActions : globalActions;
    const scopeCaffeine = activeScope === "personal" ? userCaffeine : activeScope === "course" ? courseCaffeine : globalCaffeine;
    const caffeinePerPerson = activeScope !== "personal";

    return <div className="survival-kit-page">
        <div className="stats-page">
            <div className="stats-page-header">
                {!isGuest && (
                    <div className="stats-scope" role="tablist" aria-label="Statistikbereich">
                        {(["personal", "course", "global"] as StatsScope[]).map((item) => (
                            <button
                                key={item}
                                type="button"
                                role="tab"
                                aria-selected={activeScope === item}
                                className={activeScope === item ? "is-active" : ""}
                                onClick={() => selectScope(item)}
                            >
                                {item === "personal" ? "Persönlich" : item === "course" ? "Kurs" : "Global"}
                            </button>
                        ))}
                    </div>
                )}
                <FilterDropdown
                    values={ALL_FILTERS.map(translateFilter)}
                    selectedItems={selectedFilter.map(translateFilter)}
                    returnSelected={false}
                    onChange={onFilterChange}
                    placeholder="Statistiken filtern"
                />
            </div>
            <SectionHeading heading={scopeCopy.heading} subheading={scopeCopy.hint} centered={false} />
            {selectedFilter.length === 0 ? (
                <div className="stats-page-no-filter-info">Keine Statistiken, die deinem Filter entsprechen.</div>
            ) : (
                <div className="stats-page-action-charts">
                    {actionCharts(scopeActions)}
                    {caffeineCharts(scopeCaffeine, caffeinePerPerson)}
                </div>
            )}
            {isGuest && <div className="stats-page-no-filter-info">Melde dich an, um deine persönlichen Statistiken und die deines Kurses zu sehen.</div>}
        </div>
    </div>
}

export default StatsPage;

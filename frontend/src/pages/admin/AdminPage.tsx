import "@/pages/admin/AdminPage.css";
import {useEffect, useRef, useState} from "react";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import type {QuickLink} from "@/models/QuickLink.tsx";
import {approveLink, getQuickLinksFiltered} from "@/services/quickLinkService.tsx";
import Button from "@/components/ui/Button.tsx";
import {
    AlertOctagon, AlertTriangle,
    BadgeCheck,
    BadgeX, Info,
    ShieldCheck,
    ShieldMinus,
    SquareTerminal,
    ThumbsDown, Trash2,
    ThumbsUp
} from "lucide-react";
import {snackbarService} from "@/services/snackBarService.tsx";
import type {SecurityLog} from "@/models/SecurityLog.tsx";
import {fetchUsers, fetchAdminHealth, fetchStorageUsage, getLatestLogs, setUserRole} from "@/services/adminService.tsx";
import type {AdminHealth, StorageUsage} from "@/models/AdminMonitoring.tsx";
import {formatTimestamp} from "@/services/utils.tsx";
import type {ProfileSettings} from "@/models/ProfileSettings.tsx";
import Separator from "@/components/ui/Separator.tsx";
import type {Meme} from "@/models/Meme.tsx";
import {deleteMeme, getMemesForAdmin} from "@/services/memeService.tsx";
import FilterDropdown from "@/components/ui/FilterDropdown.tsx";
import {lectureService} from "@/services/lectureService.tsx";

const SWAGGER_PATH = (import.meta.env.VITE_API_BASE_URL || "") + "/swagger-ui/index.html";
const ADMIN_MEME_PAGE_SIZE = 50;
const LOG_PAGE_SIZE = 20;

const AdminPage = () => {

    const [suggestedGames, setSuggestedGames] = useState<QuickLink[]>([]);
    const [editedGames, setEditedGames] = useState<Record<string, {
        title: string;
        description: string;
    }>>({});
    const [continuation, setContinuation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
    const [logContinuation, setLogContinuation] = useState<string | null>(null);
    const [users, setUsers] = useState<ProfileSettings[]>([]);
    const [userContinuation, setUserContinuation] = useState<string | null>(null);
    const [adminMemes, setAdminMemes] = useState<Meme[]>([]);
    const [memeContinuation, setMemeContinuation] = useState<string | null>(null);
    const [loadingMemes, setLoadingMemes] = useState(false);
    const [availableCourses, setAvailableCourses] = useState<string[]>([]);
    const [selectedMemeCourses, setSelectedMemeCourses] = useState<string[]>([]);
    const [health, setHealth] = useState<AdminHealth | null>(null);
    const [storage, setStorage] = useState<StorageUsage | null>(null);
    const [healthLoading, setHealthLoading] = useState(true);
    const [storageLoading, setStorageLoading] = useState(true);
    const suggestionsFetchId = useRef(0);
    const [pendingLinkIds, setPendingLinkIds] = useState<Set<string>>(() => new Set());

    const mergeUniqueById = (existing: QuickLink[], incoming: QuickLink[]): QuickLink[] => {
        const seen = new Set(existing.map((link) => link.id));
        return [...existing, ...incoming.filter((link) => !seen.has(link.id))];
    };

    const applySuggestions = (data: QuickLink[], nextContinuation: string | null, fetchId: number) => {
        if (fetchId !== suggestionsFetchId.current) {
            return;
        }
        setSuggestedGames(data);
        setContinuation(nextContinuation);
    };

    const refreshSuggestions = async () => {
        const fetchId = ++suggestionsFetchId.current;
        setLoading(true);

        try {
            const res = await getQuickLinksFiltered(false, false, 50);
            if (fetchId !== suggestionsFetchId.current) {
                return;
            }

            applySuggestions(
                res.data,
                res.data.length < 50 ? null : res.continuation,
                fetchId,
            );
        } finally {
            if (fetchId === suggestionsFetchId.current) {
                setLoading(false);
            }
        }
    };

    const loadSuggestions = async (continuationToken?: string | null) => {
        const fetchId = ++suggestionsFetchId.current;

        const res = await getQuickLinksFiltered(
            false,
            false,
            50,
            continuationToken ?? undefined
        );

        if (fetchId !== suggestionsFetchId.current) {
            return null;
        }

        return { ...res, fetchId };
    };

    const tabs : string[] = [
        "GENERAL",
        "QUICKLINKS",
        "MEMES",
        "SWAGGER"
    ];

    const handlePromoteUser = async (userId: string, admin: boolean) => {
        await setUserRole(userId, admin ? "ADMIN" : "USER");
        setUsers(prev =>
            prev.map(user =>
                user.userId === userId ? { ...user, role: admin ? "ADMIN" : "USER" } : user
            )
        );
        snackbarService.showSnackbar({ type: "success", text: "Rolle erfolgreich aktualisiert", showIcon: true })
    };

    const loadMoreSuggestions = async () => {
        if (loading) return;

        setLoading(true);

        const res = await loadSuggestions(continuation);
        if (!res) {
            setLoading(false);
            return;
        }

        setSuggestedGames(prev => mergeUniqueById(prev, res.data));

        setContinuation(res.continuation);
        if (res.data.length < 50) {
            setContinuation(null);
        }
        setLoading(false);
    };

    const loadMoreUsers = async () => {
        if (loading) return;

        setLoading(true);

        const res = await fetchUsers(20, userContinuation);

        setUsers(prev =>
            [...prev, ...res.data]
        );

        setUserContinuation(res.continuation);
        setLoading(false);
    };

    const refreshAdminMemes = async (course?: string | null) => {
        setLoadingMemes(true);
        try {
            const res = await getMemesForAdmin(course, ADMIN_MEME_PAGE_SIZE);
            setAdminMemes(res.data);
            setMemeContinuation(res.continuation);
        } finally {
            setLoadingMemes(false);
        }
    };

    const loadMoreAdminMemes = async () => {
        if (loadingMemes || memeContinuation === null) return;

        setLoadingMemes(true);
        try {
            const course = selectedMemeCourses[0] ?? null;
            const res = await getMemesForAdmin(course, ADMIN_MEME_PAGE_SIZE, memeContinuation);
            setAdminMemes(prev => [...prev, ...res.data]);
            setMemeContinuation(res.continuation);
        } finally {
            setLoadingMemes(false);
        }
    };

    const handleMemeCourseFilterChange = (items: string[]) => {
        const next = items.length > 0 ? [items[items.length - 1]] : [];
        setSelectedMemeCourses(next);
        void refreshAdminMemes(next[0] ?? null);
    };

    const handleDeleteMeme = async (id: string) => {
        await deleteMeme(id);
        setAdminMemes(prev => prev.filter(meme => meme.id !== id));
        snackbarService.showSnackbar({ type: "success", text: "Meme wurde gelöscht", showIcon: true });
    };

    const refreshLogs = async () => {
        if (loadingLogs) return;

        setLoadingLogs(true);
        setSecurityLogs([]);
        setLogContinuation(null);

        try {
            const res = await getLatestLogs(LOG_PAGE_SIZE, null);
            setSecurityLogs(res.data);
            setLogContinuation(res.continuation);
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadMoreLogs = async () => {
        if (loadingLogs || !logContinuation) return;

        setLoadingLogs(true);
        try {
            const res = await getLatestLogs(LOG_PAGE_SIZE, logContinuation);
            setSecurityLogs(prev => [...prev, ...res.data]);
            setLogContinuation(res.continuation);
        } finally {
            setLoadingLogs(false);
        }
    };

    const loadMonitoring = async () => {
        setHealthLoading(true);
        setStorageLoading(true);
        try {
            setHealth(await fetchAdminHealth());
        } catch {
            setHealth(null);
        } finally {
            setHealthLoading(false);
        }
        try {
            setStorage(await fetchStorageUsage());
        } catch {
            setStorage(null);
        } finally {
            setStorageLoading(false);
        }
    };

    const share = (part: number, total: number) => {
        if (part <= 0 || total <= 0) {
            return 0;
        }
        return (part / total) * 100;
    };

    const lampState = (value: string | undefined, loaded: boolean): "up" | "down" | "other" => {
        if (!loaded) {
            return "down";
        }
        const flag = (value ?? "").toUpperCase();
        if (flag === "UP") {
            return "up";
        }
        if (flag === "DOWN") {
            return "down";
        }
        return "other";
    };

    const lampLabel = (state: "up" | "down" | "other") => {
        if (state === "up") {
            return "Up";
        }
        if (state === "down") {
            return "Down";
        }
        return "Other";
    };

    const formatBytes = (value: number) => {
        if (value < 1024) {
            return `${value} B`;
        }
        if (value < 1024 * 1024) {
            return `${(value / 1024).toFixed(1)} KB`;
        }
        if (value < 1024 * 1024 * 1024) {
            return `${(value / (1024 * 1024)).toFixed(1)} MB`;
        }
        return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    };

    const updateField = (id: string, field: "title" | "description", value: string) => {
        setEditedGames(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value
            }
        }));
    };

    const handleApprove = async (game: QuickLink, approved: boolean) => {
        if (pendingLinkIds.has(game.id)) {
            return;
        }

        const edited = editedGames[game.id];
        const linkId = game.id;

        setPendingLinkIds((prev) => new Set(prev).add(linkId));
        suggestionsFetchId.current++;
        setSuggestedGames((prev) => prev.filter((g) => g.id !== linkId));

        try {
            await approveLink({
                linkId,
                approved,
                improvedTitle: edited?.title ?? game.title,
                improvedDescription: edited?.description ?? game.description,
            });

            setEditedGames((prev) => {
                const next = { ...prev };
                delete next[linkId];
                return next;
            });

            await refreshSuggestions();
            snackbarService.showSnackbar({ type: "success", text: "Bestätigung gesendet", showIcon: true });
        } catch {
            await refreshSuggestions();
        } finally {
            setPendingLinkIds((prev) => {
                const next = new Set(prev);
                next.delete(linkId);
                return next;
            });
        }
    };

    useEffect(() => {
        let cancelled = false;

        const loadSuggestionsInit = async () => {
            setLoading(true);

            const res = await loadSuggestions();
            if (!res || cancelled || res.fetchId !== suggestionsFetchId.current) {
                if (!cancelled) {
                    setLoading(false);
                }
                return;
            }

            applySuggestions(
                res.data,
                res.data.length < 50 ? null : res.continuation,
                res.fetchId,
            );
            setLoading(false);
        };

        void loadSuggestionsInit();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void refreshLogs();
        void refreshAdminMemes();
        lectureService.getAvailableCourses().then(setAvailableCourses);

        const loadUsersInit = async () => {
            const res = await fetchUsers(50);
            if (cancelled) {
                return;
            }

            setUsers(res.data);
            setUserContinuation(res.continuation);
            if (res.data.length < 50) {
                setUserContinuation(null);
            }
        };

        void loadUsersInit();
        void loadMonitoring();

        return () => {
            cancelled = true;
            suggestionsFetchId.current++;
        };
    }, []);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEditedGames((prev) => {
            const next = { ...prev };
            const activeIds = new Set(suggestedGames.map((game) => game.id));

            for (const id of Object.keys(next)) {
                if (!activeIds.has(id)) {
                    delete next[id];
                }
            }

            for (const game of suggestedGames) {
                if (!next[game.id]) {
                    next[game.id] = {
                        title: game.title,
                        description: game.description,
                    };
                }
            }

            return next;
        });
    }, [suggestedGames]);

    const TabBar = () => {
        return <div className="tab-bar">
            {
                tabs.map(tab =>
                    <div style={{
                        width: 100 / tabs.length + "%"
                    }}
                         key={tab}
                         className={`tab-bar-tab ${currentTab === tab ? "active" : ""}`}
                         onClick={() => setCurentTab(tab)}>
                         <h3 className="tab-bar-tab-name">{tab === "GENERAL" ? "ÜBERWACHUNG" : tab === "QUICKLINKS" ? "QUICKLINKS" : tab === "MEMES" ? "MEMES" : "SWAGGER"}</h3>
                    </div>
                )
            }
        </div>
    }

    const TabContent = () => {
        switch (currentTab) {
            case "GENERAL":
                return General();
            case "QUICKLINKS":
                return QuickLinks();
            case "MEMES":
                return Memes();
            case "SWAGGER":
                return Swagger();
        }
    }

    const QuickLinks = () => {
        return <div className="tab-page">
            <SectionHeading heading={"Vorgeschlagene Spiele"} subheading={"Spiele die von anderen Benutzern Vorgeschlagen wurden"} centered={false} />
            <br />
            {suggestedGames.length !== 0 && (
                <div className="suggested-games-table-header">
                    <h3 className="suggested-games-table-header-text">ID</h3>
                    <h3 className="suggested-games-table-header-text">Titel</h3>
                    <h3 className="suggested-games-table-header-text">Beschreibung</h3>
                    <h3 className="suggested-games-table-header-text">Url</h3>
                    <h3 className="suggested-games-table-header-text">Aktion</h3>
                </div>
            )}

            {suggestedGames.map(game => (
                <div
                    className={`suggested-games-table-item ${pendingLinkIds.has(game.id) ? "pending" : ""}`}
                    key={game.id}
                >

                    {/* ID */}
                    <div className="cell mono" title={game.id}>
                        {game.id.slice(0, 8)}...{game.id.slice(-6)}
                    </div>

                    {/* Title */}
                    <div className="cell">
                        <input
                            className="input-field"
                            value={editedGames[game.id]?.title ?? game.title}
                            onChange={(e) =>
                                updateField(game.id, "title", e.target.value)
                            }
                        />
                    </div>

                    {/* Description */}
                    <div className="cell">
                        <input
                            className="input-field"
                            value={editedGames[game.id]?.description ?? game.description}
                            onChange={(e) =>
                                updateField(game.id, "description", e.target.value)
                            }
                        />
                    </div>

                    {/* URL */}
                    <div className="cell">
                        <a href={game.url} target="_blank" rel="noreferrer">
                            {game.url}
                        </a>
                    </div>

                    {/* Actions */}
                    <div className="cell action-buttons">

                        <ThumbsUp
                            size={25}
                            className="icon-button approve"
                            onClick={() => void handleApprove(game, true)}
                        />
                        <ThumbsDown
                            size={25}
                            className="icon-button reject"
                            onClick={() => void handleApprove(game, false)}
                        />
                    </div>
                </div>
            ))}
            { continuation !== null && <Button text="Mehr Laden" onClick={() => loadMoreSuggestions()} variant="primary" disabled={continuation === null} /> }
            { suggestedGames.length === 0 && <h4 className="no-items-info">Es gibt aktuell keine vorgeschlagenen Spiele</h4> }
        </div>
    }

    const Memes = () => {
        return <div className="tab-page">
            <div className="admin-memes-header">
                <SectionHeading heading={"Memes"} subheading={"Alle hochgeladenen Memes verwalten"} centered={false} />
                <br />
                <FilterDropdown
                    values={availableCourses}
                    selectedItems={selectedMemeCourses}
                    returnSelected={false}
                    onChange={handleMemeCourseFilterChange}
                    placeholder="Kurs filtern"
                />
            </div>

            {adminMemes.length !== 0 && (
                <div className="admin-memes-table-header">
                    <h3>Vorschau</h3>
                    <h3>Titel</h3>
                    <h3>Beschreibung</h3>
                    <h3>Kurs</h3>
                    <h3>Aktion</h3>
                </div>
            )}

            {adminMemes.map(meme => (
                <div className="admin-memes-table-item" key={meme.id}>
                    <div className="admin-meme-preview">
                        <img src={`data:${meme.contentType};base64,${meme.img}`} alt={meme.title || "Meme"} />
                    </div>
                    <div className="cell" title={meme.title ?? ""}>{meme.title || "-"}</div>
                    <div className="cell" title={meme.description ?? ""}>{meme.description || "-"}</div>
                    <div className="cell">{meme.course}</div>
                    <div className="cell action-buttons">
                        <Trash2
                            size={23}
                            className="icon-button reject"
                            onClick={() => void handleDeleteMeme(meme.id)}
                        />
                    </div>
                </div>
            ))}

            {memeContinuation !== null && <Button text="Mehr Laden" onClick={() => loadMoreAdminMemes()} variant="primary" disabled={loadingMemes} />}
            {!loadingMemes && adminMemes.length === 0 && <h4 className="no-items-info">Es gibt aktuell keine Memes für diesen Filter</h4>}
        </div>
    }

    const General = () => {
        return <div className="tab-page">
            <SectionHeading heading={"Benutzer"} subheading={"Alle Benutzer der Anwendung"} centered={false} />
            <br />
            <div className="users-table-wrapper">
                <table className="users-table">
                    <thead>
                    <tr>
                        <th>Vorname</th>
                        <th>Nachname</th>
                        <th>Benutzername</th>
                        <th>Kurs</th>
                        <th>Rolle</th>
                        <th>Status</th>
                        <th className="col-action">Aktion</th>
                    </tr>
                    </thead>
                    <tbody>
                    {users.map((user) => (
                        <tr key={user.userId}>
                            <td>{user.firstname}</td>
                            <td>{user.lastname}</td>
                            <td className="text-secondary">{user.username}</td>
                            <td className="text-secondary">{user.course === null ? "-" : user.course}</td>
                            <td>
                                {getRoleBadge(user.role)}
                            </td>
                            <td>
                                {getVerifiedIndicator(user.isVerified)}
                            </td>
                            <td className="col-action">
                                {getRoleActionButton(user.role === "ADMIN", () => handlePromoteUser(user.userId, user.role === "USER"))}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
            <br />
            { userContinuation !== null && <Button text="Mehr Laden" onClick={() => loadMoreUsers()} variant="primary" /> }
            < Separator width={"0%"} height={"10px"} variant={"primary"} />
            < Separator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <SectionHeading heading={"Health"} subheading={"Status von Backend, Datenbank und Redis"} centered={false} />
            <br />
            {healthLoading ? (
                <p className="monitoring-muted">Laden…</p>
            ) : (
                <ul className="lamps">
                    <li>
                        <span className="lamp" data-state={lampState(health?.status, Boolean(health))} />
                        Backend {lampLabel(lampState(health?.status, Boolean(health)))}
                    </li>
                    <li>
                        <span className="lamp" data-state={lampState(health?.database, Boolean(health))} />
                        Database {lampLabel(lampState(health?.database, Boolean(health)))}
                    </li>
                    <li>
                        <span className="lamp" data-state={lampState(health?.redis, Boolean(health))} />
                        Redis {lampLabel(lampState(health?.redis, Boolean(health)))}
                    </li>
                </ul>
            )}
            < Separator width={"0%"} height={"10px"} variant={"primary"} />
            < Separator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <SectionHeading heading={"Speicher"} subheading={"Datenbanknutzung"} centered={false} />
            <br />
            {storageLoading ? (
                <p className="monitoring-muted">Laden…</p>
            ) : storage ? (
                <>
                    <p className="monitoring-total">
                        {formatBytes(storage.databaseBytes)} von ~{formatBytes(storage.capacityBytes)}
                    </p>
                    <div className="stack" aria-hidden="true">
                        {storage.categories.map(item => (
                            <span
                                key={item.id}
                                className="seg"
                                data-id={item.id}
                                style={{width: `${share(item.bytes, storage.capacityBytes)}%`}}
                            />
                        ))}
                    </div>
                    <ul className="usage">
                        {storage.categories.map(item => (
                            <li key={item.id}>
                                <div className="usage-meta">
                                    <span className="dot" data-id={item.id} />
                                    <strong>{item.label}</strong>
                                    {item.items > 0 && <small>{item.items}</small>}
                                </div>
                                <div className="track">
                                    <span
                                        className="fill"
                                        data-id={item.id}
                                        style={{width: `${share(item.bytes, storage.capacityBytes)}%`}}
                                    />
                                </div>
                                <span className="size">{formatBytes(item.bytes)}</span>
                            </li>
                        ))}
                    </ul>
                </>
            ) : (
                <p className="monitoring-muted">Speicherdaten konnten nicht geladen werden.</p>
            )}
            < Separator width={"0%"} height={"10px"} variant={"primary"} />
            < Separator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <SectionHeading heading={"Logs"} subheading={"Alle Logs der Letzten 7 Tage"} centered={false} />
            <br />
            <div className="security-logs-window">
                <div className="security-logs-header">
                    <div className="col-time">Zeitpunkt</div>
                    <div className="col-type">Typ</div>
                    <div className="col-subtype">Kategorie</div>
                    <div className="col-message">Meldung</div>
                </div>

                <div className="security-logs-body">
                    {securityLogs.map((log) => (
                        <div className="security-log-row" key={log.timestamp}>
                            <div className="security-log-time">{formatTimestamp(log.timestamp)}</div>
                            <div className="security-log-type">
                                {getLogTypeBadge(log.type)}
                            </div>
                            <div className="security-log-subtype">{log.subType}</div>
                            <div className="security-log-message">{log.message}</div>
                        </div>
                    ))}
                </div>
            </div>
            <br />
            <div className="security-logs-actions">
                <Button text="Aktualisieren" onClick={() => void refreshLogs()} variant="primary" disabled={loadingLogs} />
                <Button text="Mehr laden" onClick={() => void loadMoreLogs()} variant="secondary" disabled={loadingLogs || !logContinuation} />
            </div>
        </div>
    }

    const Swagger = () => {
        return <div className="tab-page">
            <SectionHeading heading={"Backend API"} centered={false} actions={[{ icon: SquareTerminal, text: "Swagger öffnen", link: SWAGGER_PATH }]} />
            <br />
            <div className="swagger-iframe">
                <iframe
                    src={SWAGGER_PATH}
                >
                </iframe>
            </div>
        </div>
    }

    const [currentTab, setCurentTab] = useState<string>("GENERAL")
    return <div className="survival-kit-page">
        <div className="admin-page">
                {TabBar()}
                {TabContent()}
            </div>
    </div>

    function getRoleActionButton(isAdmin : boolean, onClick : () => void) {
        return (
            <button
                type="button"
                onClick={onClick}
                title={isAdmin ? "Zum Benutzer machen" : "Zum Admin machen"}
                aria-label={isAdmin ? "Zum Benutzer machen" : "Zum Admin machen"}
                className="role-action-btn"
            >
                {isAdmin ? <ShieldMinus size={18} /> : <ShieldCheck size={18} />}
            </button>
        );
    }

    function getRoleBadge(role: string) {
        const isAdmin = role === "ADMIN";
        return (
            <span className={`role-badge ${isAdmin ? "role-badge--admin" : "role-badge--user"}`}>
      {isAdmin ? "Admin" : "Benutzer"}
    </span>
        );
    }

    function getVerifiedIndicator(isVerified : boolean) {
        return isVerified ? (
            <span className="verified verified--yes">
      <BadgeCheck size={16} />
      Verifiziert
    </span>
        ) : (
            <span className="verified verified--no">
      <BadgeX size={16} />
      Nicht Verifiziert
    </span>
        );
    }

    function getLogTypeBadge( type : string) {
        const config = {
            ERROR: { label: "Error", icon: AlertOctagon, className: "log-badge--error" },
            WARNING: { label: "Warning", icon: AlertTriangle, className: "log-badge--warning" },
            INFO: { label: "Info", icon: Info, className: "log-badge--info" },
        };

        const { label, icon: Icon, className } = config[type as "ERROR" | "WARNING" | "INFO"] ?? config.INFO;

        return (
            <span className={`log-badge ${className}`}>
      <Icon size={13} />
                {label}
    </span>
        );
    }
}

export default AdminPage;
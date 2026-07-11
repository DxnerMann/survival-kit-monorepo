import './AdminPage.css';
import {useEffect, useState} from "react";
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import type {QuickLink} from "../../models/QuickLink.tsx";
import {approveLink, getQuickLinksFiltered} from "../../services/quickLinkService.tsx";
import Button from "../../components/shared/Button.tsx";
import {
    AlertOctagon, AlertTriangle,
    BadgeCheck,
    BadgeX, Info,
    ShieldCheck,
    ShieldMinus,
    SquareTerminal,
    ThumbsDown,
    ThumbsUp
} from "lucide-react";
import {snackbarService} from "../../services/snackBarService.tsx";
import type {SecurityLog} from "../../models/SecurityLog.tsx";
import {fetchUsers, getLatestLogs, setUserRole} from "../../services/adminService.tsx";
import {formatTimestamp} from "../../services/utils.tsx";
import Footer from "../../components/Footer.tsx";
import type {ProfileSettings} from "../../models/ProfileSettings.tsx";
import Seperator from "../../components/shared/Seperator.tsx";

const SWAGGER_PATH = import.meta.env.VITE_API_BASE_URL + "/swagger-ui/index.html";

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
    const [users, setUsers] = useState<ProfileSettings[]>([]);
    const [userContinuation, setUserContinuation] = useState<string | null>(null);

    const tabs : string[] = [
        "GENERAL",
        "QUICKLINKS",
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

        const res = await getQuickLinksFiltered(
            false,
            false,
            50,
            continuation
        );

        setSuggestedGames(prev =>
            [...prev, ...res.data]
        );

        setContinuation(res.continuation);
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

    const refreshLogs = async () => {
        if (loadingLogs) return;

        setLoadingLogs(true);
        setSecurityLogs([]);

        let cursor: string | null = null;

        do {
            const res = await getLatestLogs(50, cursor);
            setSecurityLogs(prev => [...prev, ...res.data]);
            cursor = res.continuation;
        } while (cursor);

        setLoadingLogs(false);
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
        const edited = editedGames[game.id];

        await approveLink({
            linkId: game.id,
            approved: approved,
            improvedTitle: edited?.title ?? game.title,
            improvedDescription: edited?.description ?? game.description,
        });

        setSuggestedGames(prev => prev.filter(g => g.id !== game.id));
        snackbarService.showSnackbar({ type: "success",   text: "Bestätigung gesendet", showIcon: true });
    };

    useEffect(() => {

        const loadSuggestionsInit = async () => {
            if (loading) return;

            setLoading(true);

            const res = await getQuickLinksFiltered(
                false,
                false,
                50
            );

            setSuggestedGames(res.data);

            setContinuation(res.continuation);
            if (res.data.length < 50) {
                setContinuation(null);
            }
            setLoading(false);
        };

        loadSuggestionsInit();

        const loadLogsInit = async () => {
            if (loadingLogs) return;

            setLoadingLogs(true);
            const res = await getLatestLogs(
                50,
                null
            );

            setSecurityLogs(res.data);
            setLoadingLogs(false);
        };

        loadLogsInit();

        const loadUsersInit = async () => {
            if (loading) return;

            setLoading(true);

            const res = await fetchUsers(
                50
            );

            setUsers(res.data);

            setUserContinuation(res.continuation);
            if (res.data.length < 50) {
                setContinuation(null);
            }
            setLoading(false);
        };

        loadUsersInit();

    }, []);

    useEffect(() => {
        const initial: Record<string, {
            title: string;
            description: string;
        }> = {};

        suggestedGames.forEach(g => {
            initial[g.id] = {
                title: g.title,
                description: g.description
            };
        });

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setEditedGames(initial);
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
                        <h3 className="tab-bar-tab-name">{tab === "GENERAL" ? "ALLGEMEIN" : tab === "QUICKLINKS" ? "QUICKLINKS" : "SWAGGER"}</h3>
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
            case "SWAGGER":
                return Swagger();
        }
    }

    const QuickLinks = () => {
        return <div className="tab-page">
            <SectionHeading heading={"Vorgeschlagene Spiele"} subheading={"Spiele die von anderen Benutzern Vorgeschlagen wurden"} centered={false} />
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
                <div className="suggested-games-table-item" key={game.id}>

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
                            onClick={() =>
                                handleApprove(
                                    game,
                                    true
                                )
                            }
                        />
                        <ThumbsDown
                            size={25}
                            className="icon-button reject"
                            onClick={() =>
                                handleApprove(
                                    game,
                                    false
                                )
                            }
                        />
                    </div>
                </div>
            ))}
            { continuation !== null && <Button text="Mehr Laden" onClick={() => loadMoreSuggestions()} variant="primary" disabled={continuation === null} /> }
            { suggestedGames.length === 0 && <h4 className="no-items-info">Es gibt aktuell keine vorgeschlagenen Spiele</h4> }
        </div>
    }

    const General = () => {
        return <div className="tab-page">
            <SectionHeading heading={"Benutzer"} centered={false} />
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
            < Seperator width={"0%"} height={"10px"} variant={"primary"} />
            < Seperator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <SectionHeading heading={"Logs"} centered={false} />
            <div className="security-logs-window">
                <div className="security-logs-header">
                    <div className="col-time">Zeitpunkt</div>
                    <div className="col-type">Typ</div>
                    <div className="col-subtype">Kategorie</div>
                    <div className="col-message">Meldung</div>
                </div>

                <div className="security-logs-body">
                    {[...securityLogs].reverse().map((log) => (
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
            <Button text="Aktualisieren" onClick={() => refreshLogs()} variant="primary" />
        </div>
    }

    const Swagger = () => {
        return <div className="tab-page">
            <SectionHeading heading={"Backend API"} centered={false} actions={[{ icon: SquareTerminal, text: "Swagger öffnen", link: SWAGGER_PATH }]} />
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
            <Footer />
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
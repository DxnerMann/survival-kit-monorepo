import './AdminPage.css';
import {useEffect, useState} from "react";
import SectionHeading from "../../components/shared/SectionHeading.tsx";
import type {QuickLink} from "../../models/QuickLink.tsx";
import {approveLink, getQuickLinksFiltered} from "../../services/quickLinkService.tsx";
import Button from "../../components/shared/Button.tsx";
import {ThumbsDown, ThumbsUp} from "lucide-react";
import {snackbarService} from "../../services/snackBarService.tsx";

const AdminPage = () => {

    const [suggestedGames, setSuggestedGames] = useState<QuickLink[]>([]);
    const [editedGames, setEditedGames] = useState<Record<string, {
        title: string;
        description: string;
    }>>({});
    const [continuation, setContinuation] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const tabs : string[] = [
        "GENERAL",
        "QUICKLINKS"
    ];

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
            setLoading(false);
        };

        loadSuggestionsInit();
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
                         className={`tab-bar-tab ${currentTab === tab ? "active" : ""}`}
                         onClick={() => setCurentTab(tab)}>
                        <h3 className="tab-bar-tab-name">{tab}</h3>
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
            <SectionHeading heading={"Allgemeine Einstellungen"} centered={false} />
        </div>
    }

    const [currentTab, setCurentTab] = useState<string>("GENERAL")
    return <div className="admin-page">
        {TabBar()}
        {TabContent()}
    </div>
}

export default AdminPage;
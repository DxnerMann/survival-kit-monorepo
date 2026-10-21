import "@/pages/explore/ExplorePage.css";
import SectionHeading from "@/components/ui/SectionHeading.tsx";
import {useEffect, useRef, useState} from "react";
import type {QuickLink} from "@/models/QuickLink.tsx";
import {getQuickLinksFiltered, suggestLink, type QuickLinkSort} from "@/services/quickLinkService.tsx";
import QuickLinkCard from "@/components/explore/QuickLinkCard.tsx";
import Button from "@/components/ui/Button.tsx";
import {Clock, History, LayersPlus, TrendingDown, TrendingUp} from "lucide-react";
import GameSuggestionDialog from "@/components/dialog/GameSuggestionDialog.tsx";
import Minigames from "@/components/explore/Minigames.tsx";
import Separator from "@/components/ui/Separator.tsx";
import {useQuickLinkFavourites} from "@/hooks/useQuickLinkFavourites.tsx";
import SearchBar from "@/components/ui/SearchBar.tsx";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const GAME_SORTS: {sort: QuickLinkSort; label: string; icon: typeof TrendingUp}[] = [
    {sort: "POPULAR", label: "Beliebteste", icon: TrendingUp},
    {sort: "LEAST_POPULAR", label: "Am wenigsten beliebt", icon: TrendingDown},
    {sort: "NEWEST", label: "Neueste", icon: Clock},
    {sort: "OLDEST", label: "Älteste", icon: History},
];

const ExplorePage = () => {
    const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
    const [continuation, setContinuation] = useState<string | null>(null);
    const [showGameSuggestionDialog, setShowGameSuggestionDialog] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchSettled, setSearchSettled] = useState(false);
    const [sortIndex, setSortIndex] = useState(0);
    const loadingMoreRef = useRef(false);
    const fetchIdRef = useRef(0);
    const {canFavourite, isFavourite, toggleFavourite} = useQuickLinkFavourites();

    useEffect(() => {
        const timeout = window.setTimeout(() => setSearchQuery(searchInput), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(timeout);
    }, [searchInput]);

    useEffect(() => {
        const fetchId = ++fetchIdRef.current;
        setContinuation(null);
        setSearchSettled(false);
        const query = searchQuery.trim();
        const sort = GAME_SORTS[sortIndex].sort;

        getQuickLinksFiltered(true, true, PAGE_SIZE, null, query || undefined, sort)
            .then((res) => {
                if (fetchId !== fetchIdRef.current) {
                    return;
                }
                setQuickLinks(res.data);
                setContinuation(res.data.length < PAGE_SIZE ? null : res.continuation);
                setSearchSettled(true);
            })
            .catch((error) => {
                if (fetchId === fetchIdRef.current) {
                    console.error(error);
                }
            });
    }, [searchQuery, sortIndex]);

    const loadMoreLinks = async () => {
        if (loadingMoreRef.current || continuation == null || continuation === "") return;

        const fetchId = fetchIdRef.current;
        const query = searchQuery.trim();
        const sort = GAME_SORTS[sortIndex].sort;
        loadingMoreRef.current = true;
        setLoadingMore(true);
        try {
            const res = await getQuickLinksFiltered(
                true,
                true,
                PAGE_SIZE,
                continuation,
                query || undefined,
                sort
            );
            if (fetchId !== fetchIdRef.current) {
                return;
            }

            setQuickLinks(prev => {
                const seen = new Set(prev.map(link => link.id));
                return [...prev, ...res.data.filter(link => !seen.has(link.id))];
            });

            setContinuation(res.data.length < PAGE_SIZE ? null : res.continuation);
        } catch (error) {
            console.error(error);
        } finally {
            loadingMoreRef.current = false;
            setLoadingMore(false);
        }
    };


    return <div className="survival-kit-page">
        <div className="explore-page">
            <SectionHeading
                heading="Alle Browserspiele"
                centered={false}
                actions={[
                    {
                        icon: GAME_SORTS[sortIndex].icon,
                        text: GAME_SORTS[sortIndex].label,
                        title: "Sortierung ändern",
                        link: () => setSortIndex(current => (current + 1) % GAME_SORTS.length),
                    },
                    { icon: LayersPlus, text: "Spiel vorschlagen", link: () => setShowGameSuggestionDialog(true) }
                ]}
            />
            <div className="explore-page-search">
                <SearchBar
                    value={searchInput}
                    onChange={setSearchInput}
                    placeholder="Nach Titel oder Beschreibung suchen"
                    ariaLabel="Browserspiele durchsuchen"
                />
            </div>
            <GameSuggestionDialog
                isOpen={showGameSuggestionDialog}
                onCancel={() => setShowGameSuggestionDialog(false)}
                onSubmit={async (data) => {
                    await suggestLink(data);
                    setShowGameSuggestionDialog(false);
                }}
            />
            {searchSettled && searchQuery.trim() !== "" && quickLinks.length === 0 && (
                <h4 className="explore-page-empty">Keine Spiele für diese Suche gefunden.</h4>
            )}
            <div className="explore-page-games">
                {quickLinks.map((link) => (
                    <QuickLinkCard
                        key={link.id}
                        quickLink={link}
                        showClickedThisMonth={true}
                        showFavouriteButton={canFavourite}
                        isFavourite={isFavourite(link.id)}
                        onToggleFavourite={toggleFavourite}
                    />
                ))}
            </div>
            <div className="explore-page-games-load-more-button-wrapper">
                { continuation !== null && continuation !== "" && <Button variant={"primary"} text="Mehr Spiele laden" onClick={() => void loadMoreLinks()} disabled={loadingMore} />}
            </div>
            < Separator width={"100%"} height={"2px"} variant={"primary"} />
            <br />
            <Minigames heading="Weitere <a class='important-text'>Survival-Kit-Minigames</a>" />
        </div>
    </div>
}

export default ExplorePage;
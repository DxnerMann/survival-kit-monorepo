import {useCallback, useEffect, useState} from "react";
import {getAllFavourites, markAsFavourite} from "@/services/quickLinkService.tsx";
import {getUserRole} from "@/services/tokenService.tsx";

export function useQuickLinkFavourites() {
    const canFavourite = getUserRole() !== "GUEST";
    const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
    const [loaded, setLoaded] = useState(!canFavourite);

    useEffect(() => {
        if (!canFavourite) {
            return;
        }

        let cancelled = false;

        getAllFavourites()
            .then(favourites => {
                if (!cancelled) {
                    setFavouriteIds(new Set(favourites.map(f => f.id)));
                }
            })
            .catch(console.error)
            .finally(() => {
                if (!cancelled) {
                    setLoaded(true);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [canFavourite]);

    const isFavourite = useCallback((id: string) => favouriteIds.has(id), [favouriteIds]);

    const toggleFavourite = useCallback(async (id: string) => {
        const fav = !favouriteIds.has(id);
        await markAsFavourite(id, fav);
        setFavouriteIds(prev => {
            const next = new Set(prev);
            if (fav) {
                next.add(id);
            } else {
                next.delete(id);
            }
            return next;
        });
    }, [favouriteIds]);

    return {canFavourite, favouriteIds, isFavourite, toggleFavourite, loaded};
}

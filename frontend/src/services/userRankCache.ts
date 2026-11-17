import {useEffect, useState} from "react";
import type {UserRank} from "@/models/UserRank.tsx";
import {getRanks} from "@/services/rankService.tsx";

const cache = new Map<string, UserRank>();
const pending = new Set<string>();
const listeners = new Set<() => void>();
let timer = 0;

const notify = () => {
    listeners.forEach(listener => listener());
};

const flush = () => {
    const ids = [...pending];
    pending.clear();
    if (ids.length === 0) {
        return;
    }
    getRanks(ids)
        .then(ranks => {
            ranks.forEach(rank => cache.set(rank.userId, rank));
            notify();
        })
        .catch(() => {
            // A later hover asks again.
        });
};

export const requestRanks = (userIds: Array<string | null | undefined>) => {
    let added = false;
    for (const userId of userIds) {
        const id = userId?.trim();
        if (!id || cache.has(id) || pending.has(id)) {
            continue;
        }
        pending.add(id);
        added = true;
    }
    if (!added) {
        return;
    }
    window.clearTimeout(timer);
    timer = window.setTimeout(flush, 40);
};

export const useUserRank = (userId: string | null | undefined): UserRank | null => {
    const [, setTick] = useState(0);
    useEffect(() => {
        const listener = () => setTick(value => value + 1);
        listeners.add(listener);
        requestRanks([userId]);
        return () => {
            listeners.delete(listener);
        };
    }, [userId]);
    const id = userId?.trim();
    return id ? cache.get(id) ?? null : null;
};

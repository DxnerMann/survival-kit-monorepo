export type QuickLink = {
    id : string,
    title : string,
    description : string,
    url : string,
    clickedThisMonth : number,
    clickedOverall : number,
    favouriteCount : number,
    approvedByAdmin : boolean,
    addedAt : string,
    lastUpdated : string,
    lastReset : string
}

const NEW_FOR_MS = 7 * 24 * 60 * 60 * 1000;

export const isQuickLinkNew = (addedAt: string, now = Date.now()) => {
    const added = Date.parse(addedAt);
    return Number.isFinite(added) && now - added < NEW_FOR_MS;
};
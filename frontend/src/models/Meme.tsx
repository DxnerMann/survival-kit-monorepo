export type Meme = {
    id: string;
    title?: string | null;
    description?: string | null;
    img: string;
    contentType: string;
    course: string;
    authorUserId: string | null;
    addedAt: string;
    lastUpdated: string;
};

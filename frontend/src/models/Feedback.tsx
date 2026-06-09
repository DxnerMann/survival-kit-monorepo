export type Feedback = {
    id: string,
    title: string,
    description: string,
    authorUsername: string,
    authorUserId: string,
    type: FeedbackType,
    likes: number,
    dislikes: number,
    answer: string,
    addedAt: string,
    lastUpdated: string
}

export type FeedbackType = "FEEDBACK" | "BUG" | "IDEA" | "OTHER";
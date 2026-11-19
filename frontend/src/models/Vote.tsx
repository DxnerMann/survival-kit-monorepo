export type VoteResult = {
    upVote: boolean | null
    likes: number
    dislikes: number
}

export type UserVote = {
    id: string
    upVote: boolean | null
}

export type VoteMark = boolean | null | undefined

export const applyLocalVote = (
    current: VoteMark,
    like: boolean,
    likes: number,
    dislikes: number,
): {vote: VoteMark; likes: number; dislikes: number} => {
    const clamp = (value: number) => Math.max(0, value)
    if (current === undefined) {
        return {
            vote: like,
            likes: likes + (like ? 1 : 0),
            dislikes: dislikes + (like ? 0 : 1),
        }
    }
    if (current === null) {
        return {vote: like, likes, dislikes}
    }
    if (current === like) {
        return {
            vote: undefined,
            likes: clamp(likes - (like ? 1 : 0)),
            dislikes: clamp(dislikes - (like ? 0 : 1)),
        }
    }
    return {
        vote: like,
        likes: clamp(likes + (like ? 1 : -1)),
        dislikes: clamp(dislikes + (like ? -1 : 1)),
    }
}

export type ChatAttachmentKind = "IMAGE" | "GIF" | "VIDEO" | "FILE";

export type ChatAttachment = {
    id: string;
    filename: string;
    contentType: string;
    size: number;
    durationMs: number | null;
    kind: ChatAttachmentKind;
};

export type ChatReply = {
    messageId: string;
    authorUserId: string;
    authorUsername: string;
    authorColor?: string | null;
    text: string | null;
};

export type ChatReaction = {
    emoji: string;
    userId: string;
    username: string;
};

export type ChatReactionUpdate = {
    course: string;
    messageId: string;
    reactions: ChatReaction[];
};

export type ChatMessage = {
    id: string;
    course: string;
    authorUserId: string;
    authorUsername: string;
    authorColor?: string | null;
    text: string | null;
    createdAt: string;
    attachments: ChatAttachment[];
    reply?: ChatReply | null;
    clientId?: string | null;
    reactions?: ChatReaction[];
};

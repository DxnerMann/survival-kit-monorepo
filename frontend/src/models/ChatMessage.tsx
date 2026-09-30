export type ChatAttachmentKind = "IMAGE" | "GIF" | "VIDEO" | "FILE";

export type ChatAttachment = {
    id: string;
    filename: string;
    contentType: string;
    size: number;
    durationMs: number | null;
    kind: ChatAttachmentKind;
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
    clientId?: string | null;
};

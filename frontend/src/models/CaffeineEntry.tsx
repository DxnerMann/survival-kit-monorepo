export type CaffeineSource = "MONSTER" | "REDBULL" | "COFFEE" | "TABLET" | "OTHER";

export type CaffeineEntry = {
    id: string;
    userId: string;
    source: CaffeineSource;
    amountMg: number;
    consumedAt: string;
};

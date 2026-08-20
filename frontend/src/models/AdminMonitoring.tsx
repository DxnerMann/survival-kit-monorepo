export type AdminHealth = {
    status: string;
    database: string;
    redis: string;
};

export type StorageCategory = {
    id: string;
    label: string;
    bytes: number;
    items: number;
};

export type StorageUsage = {
    databaseBytes: number;
    capacityBytes: number;
    categories: StorageCategory[];
};

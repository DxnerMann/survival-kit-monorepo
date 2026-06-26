/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string
    readonly VITE_MAINTENANCE_MODE: boolean
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
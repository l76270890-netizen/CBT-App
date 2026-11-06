/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    readonly VITE_MAIN_APP_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

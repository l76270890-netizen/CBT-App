interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_SCHOOL_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.css' {
    const content: Record<string,string>;
    export default content;
}

declare module '*.png' {
    const src: string;
    export default src;
}

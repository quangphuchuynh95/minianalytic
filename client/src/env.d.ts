interface ImportMetaEnv {
  readonly VITE_TRACKER_API_URL?: string;
  readonly [key: string]: unknown;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnv {
  readonly VITE_LOCAL_MOCK?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_ENABLE_OAUTH?: string;
  readonly VITE_ENABLE_DATABASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

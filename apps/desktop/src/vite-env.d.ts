/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_PORTAL_ORIGIN?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_STORE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

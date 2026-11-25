/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the TerraByte API. Defaults to "/api" (proxied to the backend by Vite). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

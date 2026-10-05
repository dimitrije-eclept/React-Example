/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Adapter set, default `legacy-bank`. See app/composition-root.ts. */
  readonly VITE_ADAPTER?: string;
  /** Backend base URL; defaults to the page origin (use a dev proxy). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

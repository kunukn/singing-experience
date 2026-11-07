/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BUILD_NUMBER: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

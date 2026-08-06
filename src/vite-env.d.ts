/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_APP_BUILD_NUMBER: string
  readonly VITE_PRIMEUI_LICENSE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

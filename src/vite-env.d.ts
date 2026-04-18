/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface CustomWindow extends Window {
  fireConfetti?: () => void
}

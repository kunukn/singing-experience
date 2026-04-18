declare global {
  interface Window {
    app: Record<string, unknown>
  }
}

self.app = self.app || {}

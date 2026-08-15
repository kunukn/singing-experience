import { migrateStorageKeys } from '@/utils/storageMigrations'

declare global {
  interface Window {
    app: Record<string, unknown>
  }
}

self.app = self.app || {}

/* Must run before any component reads storage — `_init.ts` is imported first
 * in main.ts. Storage can throw when it is disabled or the origin is
 * sandboxed; a failed migration must never block boot. */
try {
  migrateStorageKeys()
} catch (error) {
  console.error('localStorage migration skipped', error)
}

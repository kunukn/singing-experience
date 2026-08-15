/*
 * One-time localStorage key migrations, applied on every boot before any
 * component reads storage (see `_init.ts`). Renaming a key without an entry
 * here silently resets the setting for existing users and orphans the old
 * entry forever — `storageKeys.test.ts` fails the build if that happens.
 */

type StorageMigration =
  /* Key was renamed — carry the value over, then drop the old entry. */
  | { from: string; to: string }
  /* Key is gone for good (feature removed, or merged into a shared key) —
   * delete it without copying, so it stops lingering in browser storage. */
  | { retire: string }

export const STORAGE_MIGRATIONS: readonly StorageMigration[] = [
  /* 706c37d — prefixed every key with `syng.` but shipped no migration. */
  { from: 'pitchGame.holdDurationSec', to: 'syng.pitchGameHoldDurationSec' },
  { from: 'pitchGame.gameDurationSec', to: 'syng.pitchGameDurationSec' },
  { from: 'singFly.gameDurationSec', to: 'syng.singFlyGameDurationSec' },
  { from: 'singFly.difficulty', to: 'syng.singFlyDifficulty' },

  /* Sing-tone and warm-up joined the shared `syng.rangeIndex` key. Retired
   * rather than copied: both could hold a different range, so there is no
   * non-arbitrary way to pick which one wins the shared slot. */
  { retire: 'syng.singToneRangeIndex' },
  { retire: 'syng.warmup.rangeIndex' },
]

/*
 * Idempotent: safe to run on every boot. Never overwrites a value the user
 * already set under the new key, and always removes the old entry — even when
 * it did not copy — so storage converges whether or not the value moved.
 */
export function migrateStorageKeys(
  migrations: readonly StorageMigration[] = STORAGE_MIGRATIONS,
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage,
) {
  for (const migration of migrations) {
    if ('retire' in migration) {
      storage.removeItem(migration.retire)
      continue
    }

    const value = storage.getItem(migration.from)
    if (value === null) continue

    if (storage.getItem(migration.to) === null)
      storage.setItem(migration.to, value)

    storage.removeItem(migration.from)
  }
}

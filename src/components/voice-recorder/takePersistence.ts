import { createStore, del, get, set } from 'idb-keyval'

import type { Take } from './useVoiceRecorder'

/*
 * Keeps the current take across reloads, as a best-effort extra. Nothing here
 * may throw or be awaited by the UI: the take in memory is what the app uses, so
 * when storage is missing, full, blocked or hanging, the take simply lasts until
 * the page reloads. Browsers can also delete this data on their own, so a
 * download remains the only copy a singer can rely on.
 */

const DATABASE_NAME = 'syng-voice-recorder'
const STORE_NAME = 'takes'
const CURRENT_TAKE_KEY = 'current'

/*
 * Bytes rather than a Blob, because older iOS versions had trouble keeping Blobs
 * in IndexedDB. No stopReason: "stopped early" describes the moment it happened,
 * not a take reopened later.
 */
type SavedTake = {
  bytes: ArrayBuffer
  mimeType: string
  recordedAtMs: number
  hasAutoGain: boolean
}

/* Opens nothing until first used, so a browser without IndexedDB fails inside
 * the try blocks below instead of at import. */
const takeStore = createStore(DATABASE_NAME, STORE_NAME)

/*
 * Runs one at a time. Saving first waits to read the audio bytes, so without
 * this a Clear straight after a save could finish first and the save would then
 * bring the cleared take back.
 */
let queue: Promise<unknown> = Promise.resolve()

function enqueue<T>(operation: () => Promise<T>): Promise<T> {
  const result = queue.then(operation)
  queue = result

  return result
}

let hasRequestedPersistence = false

/* Asks the browser not to evict us. It may say no, which changes nothing. */
async function requestPersistence() {
  if (hasRequestedPersistence) return

  hasRequestedPersistence = true
  await navigator.storage?.persist?.()
}

function isSavedTake(value: unknown): value is SavedTake {
  if (typeof value !== 'object' || value === null) return false

  const saved = value as Partial<SavedTake>

  return (
    saved.bytes instanceof ArrayBuffer &&
    saved.bytes.byteLength > 0 &&
    typeof saved.mimeType === 'string' &&
    Number.isFinite(saved.recordedAtMs) &&
    typeof saved.hasAutoGain === 'boolean'
  )
}

export function saveTake(take: Take): Promise<void> {
  return enqueue(async () => {
    try {
      const saved: SavedTake = {
        bytes: await take.blob.arrayBuffer(),
        mimeType: take.mimeType,
        recordedAtMs: take.recordedAt.getTime(),
        hasAutoGain: take.hasAutoGain,
      }

      await set(CURRENT_TAKE_KEY, saved, takeStore)
      await requestPersistence()
    } catch {
      /* No IndexedDB, private browsing or a full disk: memory still has it. */
    }
  })
}

export function loadTake(): Promise<Take | null> {
  return enqueue(async () => {
    try {
      const saved: unknown = await get(CURRENT_TAKE_KEY, takeStore)
      if (saved === undefined) return null

      if (!isSavedTake(saved)) {
        await del(CURRENT_TAKE_KEY, takeStore)

        return null
      }

      return {
        blob: new Blob([saved.bytes], { type: saved.mimeType }),
        mimeType: saved.mimeType,
        recordedAt: new Date(saved.recordedAtMs),
        stopReason: 'user',
        hasAutoGain: saved.hasAutoGain,
      }
    } catch {
      return null
    }
  })
}

export function deleteSavedTake(): Promise<void> {
  return enqueue(async () => {
    try {
      await del(CURRENT_TAKE_KEY, takeStore)
    } catch {
      /* Nothing could be saved in that case either. */
    }
  })
}

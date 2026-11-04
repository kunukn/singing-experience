import { createStore, del, get, set } from 'idb-keyval'

import type {
  NoteMarker,
  PitchLaneRecording,
  PitchSample,
  PitchTake,
} from './pitchLaneRecorder'
import { PITCH_LANE_IDS } from './pitchLanes'

/*
 * Keeps the current take across reloads, as a best-effort extra. Nothing here
 * may throw or be awaited by the UI: the take in memory is what the app uses, so
 * when storage is missing, full, blocked or hanging, the take simply lasts until
 * the page reloads.
 *
 * A database of its own, not a second store in the Voice Recorder's: idb-keyval
 * only creates a store when the database is first created, so a new store name
 * would never appear for anyone who already has that database.
 */

const DATABASE_NAME = 'syng-pitch-detector'
const STORE_NAME = 'takes'
const CURRENT_TAKE_KEY = 'current'

/* Opens nothing until first used, so a browser without IndexedDB fails inside
 * the try blocks below instead of at import. */
const takeStore = createStore(DATABASE_NAME, STORE_NAME)

/* Runs one at a time, so a Clear straight after a save can't finish first and
 * then have the save bring the cleared take back. */
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

function isPitchSample(value: unknown): value is PitchSample {
  if (typeof value !== 'object' || value === null) return false

  const sample = value as Partial<PitchSample>

  return (
    Number.isFinite(sample.midiNote) &&
    Number.isFinite(sample.timestamp) &&
    Number.isFinite(sample.cents) &&
    typeof sample.isClean === 'boolean'
  )
}

function isNoteMarker(value: unknown): value is NoteMarker {
  if (typeof value !== 'object' || value === null) return false

  const marker = value as Partial<NoteMarker>

  return (
    Number.isFinite(marker.midiNote) &&
    Number.isFinite(marker.timestamp) &&
    typeof marker.label === 'string' &&
    typeof marker.showLabel === 'boolean'
  )
}

function isLaneRecording(value: unknown): value is PitchLaneRecording {
  if (typeof value !== 'object' || value === null) return false

  const recording = value as Partial<PitchLaneRecording>

  return (
    Array.isArray(recording.samples) &&
    recording.samples.every(isPitchSample) &&
    Array.isArray(recording.noteMarkers) &&
    recording.noteMarkers.every(isNoteMarker)
  )
}

function isPitchTake(value: unknown): value is PitchTake {
  if (typeof value !== 'object' || value === null) return false

  const take = value as Partial<PitchTake>
  if (!Number.isFinite(take.stoppedAtMs)) return false
  if (typeof take.lanes !== 'object' || take.lanes === null) return false

  const lanes = take.lanes

  return (
    PITCH_LANE_IDS.every((laneId) => isLaneRecording(lanes[laneId])) &&
    PITCH_LANE_IDS.some((laneId) => lanes[laneId].samples.length > 0)
  )
}

export function savePitchTake(take: PitchTake): Promise<void> {
  return enqueue(async () => {
    try {
      await set(CURRENT_TAKE_KEY, take, takeStore)
      await requestPersistence()
    } catch {
      /* No IndexedDB, private browsing or a full disk: memory still has it. */
    }
  })
}

export function loadPitchTake(): Promise<PitchTake | null> {
  return enqueue(async () => {
    try {
      const saved: unknown = await get(CURRENT_TAKE_KEY, takeStore)
      if (saved === undefined) return null

      if (!isPitchTake(saved)) {
        await del(CURRENT_TAKE_KEY, takeStore)

        return null
      }

      return saved
    } catch {
      return null
    }
  })
}

export function deleteSavedPitchTake(): Promise<void> {
  return enqueue(async () => {
    try {
      await del(CURRENT_TAKE_KEY, takeStore)
    } catch {
      /* Nothing could be saved in that case either. */
    }
  })
}

import type { PitchTake } from '@/components/pitch-detector/pitchLaneRecorder'
import {
  deleteSavedPitchTake,
  loadPitchTake,
  savePitchTake,
} from '@/components/pitch-detector/pitchTakePersistence'

/*
 * The Pitch Detector's one take. It lives here in memory so it survives
 * navigating around the app, and a copy is saved in the background to survive
 * reloads where the browser allows it. Saving is never awaited: memory stays the
 * source of truth, so a storage failure can't reach the singer.
 * Shallow because thousands of samples have nothing to gain from deep proxies,
 * and IndexedDB can't store a proxy anyway.
 */
export const usePitchTakeStore = defineStore('pitchTake', () => {
  const take = shallowRef<PitchTake | null>(null)

  /* Bumped on every change, so a slow restore can't overwrite a newer decision. */
  let changeCount = 0
  let hasRestored = false

  function setTake(newTake: PitchTake) {
    changeCount++
    take.value = newTake
    void savePitchTake(newTake)
  }

  function clear() {
    changeCount++
    take.value = null
    void deleteSavedPitchTake()
  }

  /* Once per page load: later visits already have the take in memory. */
  async function restore() {
    if (hasRestored) return

    hasRestored = true

    const changeCountAtStart = changeCount
    const saved = await loadPitchTake()

    if (saved && changeCount === changeCountAtStart) take.value = saved
  }

  return { take, setTake, clear, restore }
})

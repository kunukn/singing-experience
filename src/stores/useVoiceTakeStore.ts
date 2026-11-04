import type { TakeAnalysis } from '@/components/voice-recorder/analyzeTake'
import {
  deleteSavedTake,
  loadTake,
  saveTake,
} from '@/components/voice-recorder/takePersistence'
import type { Take } from '@/components/voice-recorder/useVoiceRecorder'

/*
 * The Voice Recorder's one take. It lives here in memory so it survives
 * navigating around the app, and a copy is saved in the background to survive
 * reloads where the browser allows it. Saving is never awaited: memory stays the
 * source of truth, so a storage failure can't reach the singer.
 * Shallow because a Blob and typed arrays have nothing to gain from deep proxies.
 */
export const useVoiceTakeStore = defineStore('voiceTake', () => {
  const take = shallowRef<Take | null>(null)
  const analysis = shallowRef<TakeAnalysis | null>(null)

  /* Bumped on every change, so a slow restore can't overwrite a newer decision. */
  let changeCount = 0
  let hasRestored = false

  function setTake(newTake: Take) {
    changeCount++
    take.value = newTake
    analysis.value = null
    void saveTake(newTake)
  }

  function setAnalysis(newAnalysis: TakeAnalysis) {
    analysis.value = newAnalysis
  }

  function clear() {
    changeCount++
    take.value = null
    analysis.value = null
    void deleteSavedTake()
  }

  /* Once per page load: later visits already have the take in memory. */
  async function restore() {
    if (hasRestored) return

    hasRestored = true

    const changeCountAtStart = changeCount
    const saved = await loadTake()

    if (saved && changeCount === changeCountAtStart) take.value = saved
  }

  return { take, analysis, setTake, setAnalysis, clear, restore }
})

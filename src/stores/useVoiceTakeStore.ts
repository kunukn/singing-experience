import type { TakeAnalysis } from '@/components/voice-recorder/analyzeTake'
import type { Take } from '@/components/voice-recorder/useVoiceRecorder'

/*
 * The Voice Recorder's one take, kept here so it survives navigating around the
 * app until it's cleared or replaced. Memory only, so a reload loses it.
 * Shallow because a Blob and typed arrays have nothing to gain from deep proxies.
 */
export const useVoiceTakeStore = defineStore('voiceTake', () => {
  const take = shallowRef<Take | null>(null)
  const analysis = shallowRef<TakeAnalysis | null>(null)

  function setTake(newTake: Take) {
    take.value = newTake
    analysis.value = null
  }

  function setAnalysis(newAnalysis: TakeAnalysis) {
    analysis.value = newAnalysis
  }

  function clear() {
    take.value = null
    analysis.value = null
  }

  return { take, analysis, setTake, setAnalysis, clear }
})

import type { ScaleStep } from '@/composables/useDoReMiGame'
import type { ToneEngine } from './toneEngine'
import { defaultToneEngine } from './toneEngine'
import { noteToFrequency } from '@/utils/noteUtils'

/* Time between sequential notes in the Do-Re-Mi preview — 250 ms ≈ 16th notes at 60 BPM */
const NOTE_INTERVAL_MS = 250

type PlaySequenceOptions = {
  toneEngine?: ToneEngine
}

export { NOTE_INTERVAL_MS }

export function useDoReMiPlaySequence(options: PlaySequenceOptions = {}) {
  const engine = options.toneEngine ?? defaultToneEngine
  const isPlayingSequence = ref(false)
  const currentPlayingIndex = ref(-1)
  let timers: ReturnType<typeof setTimeout>[] = []

  async function playSequence(
    scaleSteps: ScaleStep[],
    intervalMs = NOTE_INTERVAL_MS,
  ) {
    stopSequence()
    await engine.warmUp()
    isPlayingSequence.value = true

    scaleSteps.forEach((step, i) => {
      const timer = setTimeout(() => {
        if (!isPlayingSequence.value) return

        currentPlayingIndex.value = i
        const freq = noteToFrequency(step.note, step.octave)
        engine.playTone(freq)

        if (i === scaleSteps.length - 1) {
          const endTimer = setTimeout(() => {
            isPlayingSequence.value = false
            currentPlayingIndex.value = -1
          }, intervalMs)
          timers.push(endTimer)
        }
      }, i * intervalMs)

      timers.push(timer)
    })
  }

  function stopSequence() {
    for (const timer of timers) {
      clearTimeout(timer)
    }
    timers = []
    isPlayingSequence.value = false
    currentPlayingIndex.value = -1
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      stopSequence()
    })
  }

  return {
    isPlayingSequence: readonly(isPlayingSequence),
    currentPlayingIndex: readonly(currentPlayingIndex),
    playSequence,
    stopSequence,
  }
}

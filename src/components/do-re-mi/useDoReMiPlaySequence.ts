import type { ScaleStep } from './useDoReMiGame'
import type { ToneEngine } from '@/composables/toneEngine'
import { defaultToneEngine } from '@/composables/toneEngine'
import { noteToFrequency } from '@/utils/noteUtils'

/* Time between sequential notes in the Do-Re-Mi preview — 250 ms ≈ 16th notes at 60 BPM */
const NOTE_INTERVAL_MS = 250

/* Lead-in before the first scheduled note. Gives Tone.js time to settle the
 * audio-clock schedule so the first note's audio + draw fire together rather
 * than racing against the current audio time. */
const LEAD_IN_S = 0.05

type PlaySequenceOptions = {
  toneEngine?: ToneEngine
}

export { NOTE_INTERVAL_MS }

export function useDoReMiPlaySequence(options: PlaySequenceOptions = {}) {
  const engine = options.toneEngine ?? defaultToneEngine
  const isPlayingSequence = ref(false)
  const currentPlayingIndex = ref(-1)

  async function playSequence(
    scaleSteps: ScaleStep[],
    intervalMs = NOTE_INTERVAL_MS,
  ) {
    stopSequence()
    await engine.warmUp()
    isPlayingSequence.value = true

    const intervalS = intervalMs / 1000
    /* Slightly shorter than the interval so consecutive notes don't overlap. */
    const noteDurationS = (intervalMs - 20) / 1000
    const startAt = engine.getNow() + LEAD_IN_S

    scaleSteps.forEach((step, i) => {
      const when = startAt + i * intervalS
      const freq = noteToFrequency(step.note, step.octave)

      engine.playToneAt(freq, noteDurationS, when)
      engine.scheduleDraw(() => {
        if (!isPlayingSequence.value) return

        currentPlayingIndex.value = i
      }, when)
    })

    /* End-of-sequence cleanup, one interval after the last note's start. */
    const endAt = startAt + scaleSteps.length * intervalS
    engine.scheduleDraw(() => {
      isPlayingSequence.value = false
      currentPlayingIndex.value = -1
    }, endAt)
  }

  function stopSequence() {
    engine.cancelScheduled(0)
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

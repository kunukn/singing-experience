import type { ScaleStep } from '@/composables/useDoReMiGame'
import { noteToFrequency } from '@/utils/noteUtils'

const NOTE_INTERVAL_MS = 250

type PlaySequenceOptions = {
  playTone?: (frequencyHz: number) => void | Promise<void>
  warmUp?: () => Promise<void>
}

export { NOTE_INTERVAL_MS }

export function useDoReMiPlaySequence(options: PlaySequenceOptions = {}) {
  const tonePlayer = options.playTone ? null : useTonePlayer()
  const playToneFn = options.playTone ?? tonePlayer!.playTone
  const warmUpFn = options.warmUp ?? tonePlayer?.warmUp

  const isPlayingSequence = ref(false)
  const currentPlayingIndex = ref(-1)
  let timers: ReturnType<typeof setTimeout>[] = []

  async function playSequence(
    scaleSteps: ScaleStep[],
    intervalMs = NOTE_INTERVAL_MS,
  ) {
    stopSequence()

    if (warmUpFn) {
      await warmUpFn()
    }

    isPlayingSequence.value = true

    scaleSteps.forEach((step, i) => {
      const timer = setTimeout(() => {
        if (!isPlayingSequence.value) return

        currentPlayingIndex.value = i
        const freq = noteToFrequency(step.note, step.octave)
        playToneFn(freq)

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

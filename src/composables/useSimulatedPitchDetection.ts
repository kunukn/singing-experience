import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { frequencyToNote, noteToFrequency } from '@/utils/noteUtils'

type SimulationConfig = {
  note: Ref<NoteName>
  octave: Ref<number>
  cents: Ref<number>
  clarity: Ref<number>
  jitter: Ref<number>
}

export function useSimulatedPitchDetection(config: SimulationConfig) {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const clarity = ref(0)
  const isListening = ref(false)
  const isClean = ref(false)
  const error = ref<string | null>(null)

  let animationFrameId: number | null = null
  // Tracks the last detected MIDI note to apply hysteresis in frequencyToNote
  let prevMidi: number | undefined = undefined

  function computeSimulatedFrequency(): number {
    const baseFrequency = noteToFrequency(
      config.note.value,
      config.octave.value,
    )
    const centsOffset =
      config.cents.value + (Math.random() - 0.5) * config.jitter.value
    return baseFrequency * Math.pow(2, centsOffset / 1200)
  }

  function tick() {
    if (!isListening.value) return

    const simulatedHz = computeSimulatedFrequency()
    frequency.value = Math.round(simulatedHz * 10) / 10
    const detected = frequencyToNote(simulatedHz, prevMidi)
    noteInfo.value = detected
    prevMidi = detected?.midiNote
    clarity.value = Math.min(1, Math.max(0, config.clarity.value))
    isClean.value = clarity.value >= 0.85

    animationFrameId = requestAnimationFrame(tick)
  }

  function start() {
    if (isListening.value) return

    error.value = null
    isListening.value = true
    tick()
  }

  function stop() {
    isListening.value = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    frequency.value = null
    noteInfo.value = null
    clarity.value = 0
    isClean.value = false
    prevMidi = undefined
  }

  return {
    frequency: readonly(frequency),
    noteInfo: readonly(noteInfo),
    clarity: readonly(clarity),
    isListening: readonly(isListening),
    isClean: readonly(isClean),
    error: readonly(error),
    start,
    stop,
  }
}

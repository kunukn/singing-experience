import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { frequencyToNote, noteToFrequency } from '@/utils/noteUtils'

type SimulationConfig = {
  note: Ref<NoteName>
  octave: Ref<number>
  cents: Ref<number>
  clarity: Ref<number>
  jitter: Ref<number>
  /* Frequency of A4 detection measures against, mirroring usePitchDetection's
   * option. The simulated sound itself stays on the 440 grid, like a real
   * instrument or recording — so changing the reference moves the readout, and
   * "Match a song" can be exercised against a fixed source. Defaults to 440. */
  referenceA4?: MaybeRefOrGetter<number>
}

/* Level reported whenever the simulated voice makes any sound, well above what
 * a quiet room reads on a real mic */
const SIMULATED_VOICE_LEVEL = 0.1

export function useSimulatedPitchDetection(config: SimulationConfig) {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const clarity = ref(0)
  const level = ref(0)
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
    /* Uniform in ±jitter — the "±N¢" the test pages label it with */
    const centsOffset =
      config.cents.value + (Math.random() * 2 - 1) * config.jitter.value
    // 1200 cents = 1 octave; 2^(cents/1200) converts cents offset to frequency ratio
    return baseFrequency * Math.pow(2, centsOffset / 1200)
  }

  function tick() {
    if (!isListening.value) return

    const simulatedHz = computeSimulatedFrequency()
    frequency.value = Math.round(simulatedHz * 10) / 10
    const detected = frequencyToNote(
      simulatedHz,
      prevMidi,
      toValue(config.referenceA4),
    )
    noteInfo.value = detected
    prevMidi = detected?.midiNote
    clarity.value = Math.min(1, Math.max(0, config.clarity.value))
    // 0.85 matches CLARITY_THRESHOLD in usePitchDetection — keeps simulation consistent
    isClean.value = clarity.value >= 0.85
    /* Clarity 0 is the voice switched off; anything above it is sound, clean
     * or not */
    level.value = clarity.value > 0 ? SIMULATED_VOICE_LEVEL : 0

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
    level.value = 0
    isClean.value = false
    prevMidi = undefined
  }

  return {
    frequency: readonly(frequency),
    noteInfo: readonly(noteInfo),
    clarity: readonly(clarity),
    level: readonly(level),
    isListening: readonly(isListening),
    isClean: readonly(isClean),
    error: readonly(error),
    start,
    stop,
  }
}

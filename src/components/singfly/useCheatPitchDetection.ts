import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote, midiToFrequency } from '@/utils/noteUtils'

/**
 * Mic-free debug detection source for the singfly "cheat buttons" mode.
 *
 * Shaped identically to a real/simulated PitchDetectionInput so it drops into
 * the same useStablePitch → useBirdMotion → useSingFly pipeline. Holding an
 * on-screen tone button calls holdMidi(midi) — every RAF frame it emits a fresh
 * perfectly-on-pitch NoteInfo for that note (the per-frame tick the stabilizer
 * and bird-motion smoother rely on). Releasing calls releaseMidi() — noteInfo
 * goes null (silence) while isListening stays true so the canvas keeps
 * rendering and the round keeps running, exactly as a mic dropout would.
 *
 * The microphone is never touched, so this is safe on test pages and behind the
 * real page's ?debug=1 gate.
 */
export function useCheatPitchDetection() {
  const frequency = ref<number | null>(null)
  const noteInfo = ref<NoteInfo | null>(null)
  const clarity = ref(0)
  const isListening = ref(false)
  const isClean = ref(false)
  const error = ref<string | null>(null)

  /* The note currently held down via a cheat button; null = silence (released). */
  const heldMidi = ref<number | null>(null)

  let animationFrameId: number | null = null

  function tick() {
    if (!isListening.value) return

    if (heldMidi.value === null) {
      /* Released — silence. Keep isListening so the canvas/game stay live. */
      frequency.value = null
      noteInfo.value = null
      clarity.value = 0
      isClean.value = false
    } else {
      const hz = midiToFrequency(heldMidi.value)
      frequency.value = Math.round(hz * 10) / 10
      /* Fresh object every frame — the pipeline treats each emission as a tick.
       * A held button is a perfectly on-pitch, fully-clean sustained note. */
      noteInfo.value = frequencyToNote(hz)
      clarity.value = 1
      isClean.value = true
    }

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

    heldMidi.value = null
    frequency.value = null
    noteInfo.value = null
    clarity.value = 0
    isClean.value = false
  }

  function holdMidi(midi: number) {
    heldMidi.value = midi
  }

  function releaseMidi() {
    heldMidi.value = null
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
    holdMidi,
    releaseMidi,
  }
}

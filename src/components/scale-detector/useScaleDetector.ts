import { useRafFn } from '@vueuse/core'
import {
  createNoteSegmenter,
  type NoteEvent,
} from '@/components/song-recorder/noteSegmenter'
import { createPianoNoteCapture } from '@/components/song-recorder/pianoNoteCapture'
import type { PitchDetectionInput } from '@/components/song-recorder/useSongRecorder'
import { frequencyToMidi } from '@/utils/noteUtils'
import {
  detectScales,
  type ScaleCandidate,
  type SungNote,
} from '@/utils/scaleDetection'

type Options = {
  detection: Pick<
    PitchDetectionInput,
    'frequency' | 'isClean' | 'start' | 'stop'
  >
}

/* A tapped key counts as a held note of at least this length, so a quick
 * tap still carries tonic weight. */
const PIANO_MIN_NOTE_MS = 300

/*
 * A sung note must last this long to count. Matching is strict — one stray
 * note removes the right scale — so the segmenter's 80 ms floor (tuned for
 * Song Recorder, where every note is written down) lets through too many
 * blips: a scoop or wobble that settles a semitone off for ~100 ms. A sung
 * note meant as a note is ~300 ms or more.
 */
const VOICE_MIN_NOTE_MS = 200

/* The mic ignores the voice this long after a key is released, so the
 * piano's own decay isn't heard back as a sung note (and its overtones as
 * wrong ones). */
const PIANO_DEAF_MS = 600

export type ScaleSelection = Pick<ScaleCandidate, 'root' | 'mode'>

export type ScaleDetectorResult = ReturnType<typeof useScaleDetector>

/*
 * Collects sung notes (from the mic while listening) and played notes (from
 * the piano, always) into one ordered list and ranks the scales they fit.
 * Notes count once they've ended, so the ranking settles between notes
 * rather than flickering while one is held.
 */
export function useScaleDetector({ detection }: Options) {
  const isListening = ref(false)
  const voiceEvents = shallowRef<NoteEvent[]>([])
  const pianoEvents = shallowRef<NoteEvent[]>([])
  const selection = ref<ScaleSelection | null>(null)

  let segmenter = createNoteSegmenter()
  let pianoCapture = createPianoNoteCapture({ minNoteMs: PIANO_MIN_NOTE_MS })
  /* performance.now() when the current set of notes began. */
  let originMs = performance.now()
  let voiceMutedUntilMs = 0

  const nowMs = () => performance.now() - originMs

  function syncVoiceEvents() {
    if (segmenter.events.length !== voiceEvents.value.length) {
      voiceEvents.value = [...segmenter.events]
    }
  }

  const sampler = useRafFn(
    () => {
      const timeMs = nowMs()
      const isPianoSounding =
        pianoCapture.heldMidi() !== null || timeMs < voiceMutedUntilMs
      const frequency = detection.frequency.value
      const midi =
        !isPianoSounding && detection.isClean.value && frequency !== null
          ? frequencyToMidi(frequency)
          : null
      segmenter.push(timeMs, midi)
      syncVoiceEvents()
    },
    { immediate: false },
  )

  const notes = computed<SungNote[]>(() =>
    [
      ...voiceEvents.value.filter(
        (event) => event.endMs - event.startMs >= VOICE_MIN_NOTE_MS,
      ),
      ...pianoEvents.value,
    ]
      .toSorted((a, b) => a.startMs - b.startMs)
      .map((event) => ({
        midi: event.midi,
        durationMs: event.endMs - event.startMs,
      })),
  )

  const result = computed(() => detectScales(notes.value))

  /* The user's pick while it still fits; otherwise the best guess. */
  const selectedCandidate = computed<ScaleSelection | null>(() => {
    const candidates = result.value.families.flatMap(
      (family) => family.candidates,
    )
    const picked = selection.value
    const isPickedStillFitting =
      picked !== null &&
      candidates.some(
        (candidate) =>
          candidate.root === picked.root && candidate.mode === picked.mode,
      )
    if (isPickedStillFitting) return picked

    const best = candidates[0]

    return best ? { root: best.root, mode: best.mode } : null
  })

  function select(candidate: ScaleSelection) {
    selection.value = { root: candidate.root, mode: candidate.mode }
  }

  async function startListening() {
    if (isListening.value) return

    isListening.value = true
    await detection.start()
    sampler.resume()
  }

  function stopListening() {
    if (!isListening.value) return

    isListening.value = false
    sampler.pause()
    segmenter.flush()
    syncVoiceEvents()
    detection.stop()
  }

  function toggleListening() {
    if (isListening.value) stopListening()
    else void startListening()
  }

  function pressPianoKey(midi: number) {
    /* Pressing a new key while one is held ends the held one. */
    if (pianoCapture.press(midi, nowMs())) {
      pianoEvents.value = [...pianoCapture.events]
    }
  }

  function releasePianoKey(midi: number) {
    const timeMs = nowMs()
    if (!pianoCapture.release(midi, timeMs)) return

    voiceMutedUntilMs = timeMs + PIANO_DEAF_MS
    pianoEvents.value = [...pianoCapture.events]
  }

  function reset() {
    segmenter = createNoteSegmenter()
    pianoCapture = createPianoNoteCapture({ minNoteMs: PIANO_MIN_NOTE_MS })
    originMs = performance.now()
    voiceMutedUntilMs = 0
    voiceEvents.value = []
    pianoEvents.value = []
    selection.value = null
  }

  onUnmounted(stopListening)

  return {
    isListening: readonly(isListening),
    notes,
    result,
    selectedCandidate,
    select,
    toggleListening,
    pressPianoKey,
    releasePianoKey,
    reset,
  }
}

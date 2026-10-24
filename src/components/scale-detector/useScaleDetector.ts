import { useRafFn } from '@vueuse/core'
import {
  createNoteSegmenter,
  type NoteEvent,
} from '@/components/song-recorder/noteSegmenter'
import type { PitchDetectionInput } from '@/components/song-recorder/useSongRecorder'
import { detectChords, type ChordCandidate } from '@/utils/chordDetection'
import { frequencyToMidi } from '@/utils/noteUtils'
import {
  detectScales,
  type ScaleCandidate,
  type SungNote,
} from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'
import { createPianoChordCapture } from './pianoChordCapture'

type Options = {
  detection: Pick<
    PitchDetectionInput,
    'frequency' | 'isClean' | 'start' | 'stop'
  >
  /* False = piano only: Start begins a session without opening the mic, for
   * rooms too noisy to sing in. Defaults to on. */
  isVoiceEnabled?: Readonly<Ref<boolean>>
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

/* "Without G: Dm9" hints shown when nothing fits — a few is plenty, since
 * the wrong note is usually the latest one. */
const MAX_FIXES_SHOWN = 3

export type ScaleSelection = Pick<ScaleCandidate, 'root' | 'mode'>

export type ChordSelection = Pick<ChordCandidate, 'root' | 'type'>

/* Dropping `pitchClass` from the notes would make this chord or scale fit. */
export type ChordFix = ChordSelection & {
  pitchClass: number
  bass: number | null
}

export type ScaleFix = ScaleSelection & { pitchClass: number }

export type ScaleDetectorResult = ReturnType<typeof useScaleDetector>

/*
 * Collects sung notes (from the mic) and played notes (from the piano, any
 * number of keys at once) while listening into one ordered list, and ranks
 * both the scales and the chords they fit.
 * Notes count once they've ended, so the ranking settles between notes
 * rather than flickering while one is held.
 */
export function useScaleDetector({
  detection,
  isVoiceEnabled = ref(true),
}: Options) {
  const isListening = ref(false)
  const voiceEvents = shallowRef<NoteEvent[]>([])
  const pianoEvents = shallowRef<NoteEvent[]>([])
  const selection = ref<ScaleSelection | null>(null)
  const chordSelection = ref<ChordSelection | null>(null)
  /*
   * pitch class → nowMs() when the user removed it. Notes of that pitch
   * class that started before then are left out, so a wrong note goes away
   * without touching the recorders; sung or played again later, it counts.
   */
  const removedAtMs = shallowRef(new Map<number, number>())

  let segmenter = createNoteSegmenter()
  let pianoCapture = createPianoChordCapture({ minNoteMs: PIANO_MIN_NOTE_MS })
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
        pianoCapture.isAnyHeld() || timeMs < voiceMutedUntilMs
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
      .filter((event) => {
        const removedAt = removedAtMs.value.get(pitchClassOf(event.midi))

        return removedAt === undefined || event.startMs > removedAt
      })
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

  const chordResult = computed(() => detectChords(notes.value))

  /* Same rule as scales: the user's pick while it still fits, else the best. */
  const selectedChord = computed<ChordSelection | null>(() => {
    const candidates = chordResult.value.families.flatMap(
      (family) => family.candidates,
    )
    const picked = chordSelection.value
    const isPickedStillFitting =
      picked !== null &&
      candidates.some(
        (candidate) =>
          candidate.root === picked.root && candidate.type === picked.type,
      )
    if (isPickedStillFitting) return picked

    const best = candidates[0]

    return best ? { root: best.root, type: best.type } : null
  })

  function selectChord(candidate: ChordSelection) {
    chordSelection.value = { root: candidate.root, type: candidate.type }
  }

  function removePitchClass(pitchClass: number) {
    removedAtMs.value = new Map(removedAtMs.value).set(pitchClass, nowMs())
  }

  /* Each sung pitch class once, the latest newcomer first: a slip is
   * usually the last note added. */
  const pitchClassesLatestFirst = computed(() =>
    [
      ...new Set(notes.value.map((note) => pitchClassOf(note.midi))),
    ].toReversed(),
  )

  /*
   * When nothing fits, the single notes whose removal would make something
   * fit — each paired with what the notes would then detect as.
   */
  function findFixes<
    Detection extends { hasEnoughNotes: boolean; families: unknown[] },
  >(detection: Detection, detect: (notes: SungNote[]) => Detection) {
    if (!detection.hasEnoughNotes || detection.families.length > 0) return []

    return pitchClassesLatestFirst.value
      .map((pitchClass) => ({
        pitchClass,
        detection: detect(
          notes.value.filter((note) => pitchClassOf(note.midi) !== pitchClass),
        ),
      }))
      .filter(
        ({ detection: without }) =>
          without.hasEnoughNotes && without.families.length > 0,
      )
      .slice(0, MAX_FIXES_SHOWN)
  }

  const chordFixes = computed<ChordFix[]>(() =>
    findFixes(chordResult.value, detectChords).map(
      ({ pitchClass, detection }) => {
        const [best] = detection.families[0].candidates

        return {
          pitchClass,
          root: best.root,
          type: best.type,
          bass: detection.bass,
        }
      },
    ),
  )

  const scaleFixes = computed<ScaleFix[]>(() =>
    findFixes(result.value, detectScales).map(({ pitchClass, detection }) => {
      const [best] = detection.families[0].candidates

      return { pitchClass, root: best.root, mode: best.mode }
    }),
  )

  let isVoiceRunning = false

  async function startVoice() {
    if (isVoiceRunning) return

    isVoiceRunning = true
    await detection.start()
    /* Voice may have been switched off while the mic was opening. */
    if (isVoiceRunning) sampler.resume()
  }

  function stopVoice() {
    if (!isVoiceRunning) return

    isVoiceRunning = false
    sampler.pause()
    segmenter.flush()
    syncVoiceEvents()
    detection.stop()
  }

  async function startListening() {
    if (isListening.value) return

    isListening.value = true
    if (isVoiceEnabled.value) await startVoice()
  }

  function stopListening() {
    if (!isListening.value) return

    isListening.value = false
    /* Keys still held at Stop end here; their later release is ignored. */
    if (pianoCapture.isAnyHeld()) {
      pianoCapture.flush(nowMs())
      pianoEvents.value = pianoCapture.snapshot()
    }
    stopVoice()
  }

  /* Switching input mode mid-session opens or closes only the mic; the
   * session and the notes caught so far carry on. */
  watch(isVoiceEnabled, (isEnabled) => {
    if (!isListening.value) return

    if (isEnabled) void startVoice()
    else stopVoice()
  })

  function toggleListening() {
    if (isListening.value) stopListening()
    else void startListening()
  }

  function pressPianoKey(midi: number) {
    if (!isListening.value) return

    pianoCapture.press(midi, nowMs())
    pianoEvents.value = pianoCapture.snapshot()
  }

  function releasePianoKey(midi: number) {
    const timeMs = nowMs()
    if (!pianoCapture.release(midi, timeMs)) return

    voiceMutedUntilMs = timeMs + PIANO_DEAF_MS
    pianoEvents.value = pianoCapture.snapshot()
  }

  function reset() {
    segmenter = createNoteSegmenter()
    pianoCapture = createPianoChordCapture({ minNoteMs: PIANO_MIN_NOTE_MS })
    originMs = performance.now()
    voiceMutedUntilMs = 0
    voiceEvents.value = []
    pianoEvents.value = []
    selection.value = null
    chordSelection.value = null
    removedAtMs.value = new Map()
  }

  onUnmounted(stopListening)

  return {
    isListening: readonly(isListening),
    notes,
    result,
    selectedCandidate,
    select,
    chordResult,
    selectedChord,
    selectChord,
    removePitchClass,
    chordFixes,
    scaleFixes,
    toggleListening,
    pressPianoKey,
    releasePianoKey,
    reset,
  }
}

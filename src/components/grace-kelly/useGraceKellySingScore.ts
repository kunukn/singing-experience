import type { Ref } from 'vue'

/* Minimum fraction of notes that must be sung correctly for the end-of-song
 * celebration to fire. 0.8 = 80%. */
const CONFETTI_THRESHOLD = 0.8

/* A note counts as correct when at least this fraction of the time the singer
 * was voicing during that note landed on the target pitch. */
const NOTE_PASS_RATIO = 0.5

/* Ignore notes the singer barely voiced (a stray frame or two of bleed from a
 * neighbouring note). Below this the note is treated as "not sung" → incorrect,
 * so a single grazing frame can't mark a note green. */
const MIN_VOICED_MS = 40

/*
 * Scores a live sing run note by note. Each frame, the voiced/on-pitch time is
 * added to a bucket for the note the timeline is currently on. When the run
 * ends, every note is graded: correct if the singer was on-pitch for at least
 * NOTE_PASS_RATIO of the time they were voicing it. The overall score is simply
 * correct notes ÷ total notes, and `correctNoteIndices` drives the green
 * notehead feedback on the sheet.
 *
 * The requestAnimationFrame loop runs only while `isPlaying`, so pauses are
 * excluded.
 */
export function useGraceKellySingScore(params: {
  isPlaying: Ref<boolean>
  /* True while a clean sung pitch is detected (frequency !== null). */
  isVoiced: Ref<boolean>
  /* True while the sung pitch is within scoring tolerance of the target note. */
  isOnPitch: Ref<boolean>
  /* Reading-order index of the note the timeline is currently on; null between
   * notes. Indexes line up with the melody's `notes` array and the sheet's
   * rendered noteheads. */
  activeNoteIndex: Ref<number | null>
  /* Total notes in the current melody — the score denominator. */
  noteCount: Ref<number>
}) {
  const { isPlaying, isVoiced, isOnPitch, activeNoteIndex, noteCount } = params

  /* Per-note accumulators, indexed by reading-order note index. Plain arrays
   * (not refs) — mutated every frame, then snapshotted into the reactive
   * `noteResults` when the run ends. */
  let noteVoicedMs: number[] = []
  let noteOnPitchMs: number[] = []

  /* One boolean per note: true = sung correctly. Populated when the run ends. */
  const noteResults = ref<boolean[]>([])

  let rafId: number | null = null
  let lastTimestamp: number | null = null

  function tick(timestamp: number) {
    const index = activeNoteIndex.value
    if (lastTimestamp !== null && isVoiced.value && index !== null) {
      const delta = timestamp - lastTimestamp
      noteVoicedMs[index] = (noteVoicedMs[index] ?? 0) + delta
      if (isOnPitch.value)
        noteOnPitchMs[index] = (noteOnPitchMs[index] ?? 0) + delta
    }
    lastTimestamp = timestamp
    rafId = requestAnimationFrame(tick)
  }

  /* Grade every note from its bucket. Called when the run ends. */
  function recomputeResults() {
    const results: boolean[] = []
    for (let index = 0; index < noteCount.value; index++) {
      const voiced = noteVoicedMs[index] ?? 0
      const onPitch = noteOnPitchMs[index] ?? 0
      results[index] =
        voiced >= MIN_VOICED_MS && onPitch / voiced >= NOTE_PASS_RATIO
    }
    noteResults.value = results
  }

  function startTicking() {
    if (rafId !== null) return

    lastTimestamp = null // skip the first delta (unknown gap since last run)
    rafId = requestAnimationFrame(tick)
  }

  function stopTicking() {
    if (rafId !== null) cancelAnimationFrame(rafId)

    rafId = null
    lastTimestamp = null
  }

  /* Zero the accumulators and results for a fresh run. Call on each new start(). */
  function reset() {
    noteVoicedMs = []
    noteOnPitchMs = []
    noteResults.value = []
  }

  const correctNoteIndices = computed(() =>
    noteResults.value.flatMap((isCorrect, index) => (isCorrect ? [index] : [])),
  )
  const onPitchRatio = computed(() => {
    const total = noteResults.value.length
    if (total === 0) return 0

    return correctNoteIndices.value.length / total
  })
  const reachedThreshold = computed(
    () => onPitchRatio.value >= CONFETTI_THRESHOLD,
  )

  watch(isPlaying, (playing) => {
    if (playing) {
      startTicking()
    } else {
      stopTicking()
      recomputeResults()
    }
  })

  onUnmounted(stopTicking)

  return { onPitchRatio, reachedThreshold, correctNoteIndices, reset }
}

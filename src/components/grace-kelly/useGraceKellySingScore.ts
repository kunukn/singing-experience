import type { Ref } from 'vue'

/* Minimum fraction of notes that must be sung correctly for the end-of-song
 * celebration to fire. 0.8 = 80%. */
const CONFETTI_THRESHOLD = 0.8

/* A note counts as correct once the singer has been on its target pitch for this
 * long in total — regardless of how much wrong-pitch time surrounds it. Hitting
 * the note for a real moment is enough; you don't have to spend the *majority*
 * of the note on it. */
const MIN_ON_PITCH_MS = 100

/* For short/fast notes a flat 100ms can exceed the note itself, so the dwell
 * needed is capped at this fraction of the note's duration (e.g. a 167ms eighth
 * needs ~83ms, not 100ms). */
const DWELL_FRACTION = 0.5

/*
 * Scores a live sing run note by note. Each frame, the on-pitch time is added to
 * a bucket for the note the timeline is currently on. When the run ends, every
 * note is graded correct if the singer was on its target pitch for at least
 * `min(MIN_ON_PITCH_MS, DWELL_FRACTION × noteDuration)` — a minimum dwell, not a
 * majority. The overall score is correct notes ÷ total notes, and
 * `correctNoteIndices` drives the green notehead feedback on the sheet.
 *
 * The requestAnimationFrame loop runs only while `isPlaying`, so pauses are
 * excluded.
 */
export function useGraceKellySingScore(params: {
  isPlaying: Ref<boolean>
  /* True while the sung pitch is within scoring tolerance of the target note.
   * Implies a clean voiced pitch (it's false when no pitch is detected). */
  isOnPitch: Ref<boolean>
  /* Reading-order index of the note the timeline is currently on; null between
   * notes. Indexes line up with the melody's `notes` array and the sheet's
   * rendered noteheads. */
  activeNoteIndex: Ref<number | null>
  /* Sounding duration of each note in ms, indexed in reading order. Its length
   * is the score denominator (total notes). */
  noteDurationsMs: Ref<number[]>
}) {
  const { isPlaying, isOnPitch, activeNoteIndex, noteDurationsMs } = params

  /* Per-note on-pitch time, indexed by reading-order note index. Plain array
   * (not a ref) — mutated every frame, then graded into the reactive
   * `noteResults` when the run ends. */
  let noteOnPitchMs: number[] = []

  /* One boolean per note: true = sung correctly. Populated when the run ends. */
  const noteResults = ref<boolean[]>([])

  let rafId: number | null = null
  let lastTimestamp: number | null = null

  function tick(timestamp: number) {
    const index = activeNoteIndex.value
    if (lastTimestamp !== null && isOnPitch.value && index !== null) {
      noteOnPitchMs[index] =
        (noteOnPitchMs[index] ?? 0) + (timestamp - lastTimestamp)
    }
    lastTimestamp = timestamp
    rafId = requestAnimationFrame(tick)
  }

  /* Grade every note from its on-pitch bucket. Called when the run ends. */
  function recomputeResults() {
    const durations = noteDurationsMs.value
    const results: boolean[] = []
    for (let index = 0; index < durations.length; index++) {
      const dwellNeeded = Math.min(
        MIN_ON_PITCH_MS,
        DWELL_FRACTION * durations[index],
      )
      results[index] = (noteOnPitchMs[index] ?? 0) >= dwellNeeded
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

import type { Ref } from 'vue'

/* Minimum fraction of notes that must be sung correctly for the end-of-song
 * celebration to fire. 0.8 = 80%. */
const CONFETTI_THRESHOLD = 0.8

/* A note never needs more than this much on-pitch time, no matter how long it
 * sounds — holding a 1s tied note for 100ms is enough. */
const MAX_ON_PITCH_MS = 100

/* A note counts as correct once the singer has been on its target pitch for
 * this fraction of the note's duration, in total — regardless of how much
 * wrong-pitch time surrounds it. 0.25 keeps short notes hittable: fixed costs
 * (mic latency, pitch-smoothing convergence, voice articulation) eat ~50–80ms
 * of every note, which is a big slice of a ~167ms eighth. */
const DWELL_FRACTION = 0.25

/*
 * Scores a live sing run note by note. Each frame, the on-pitch time is added to
 * a bucket for the note the timeline is currently on; the note is marked correct
 * the moment its bucket reaches `min(MAX_ON_PITCH_MS, DWELL_FRACTION ×
 * noteDuration)` — a minimum dwell, not a majority. Marking happens live
 * (mid-run) so the sheet can paint
 * noteheads green in real time. The overall score is correct notes ÷ total
 * notes, and `correctNoteIndices` drives the green notehead feedback.
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

  /* One boolean per note: true = sung correctly. Marked live during the run. */
  const noteResults = ref<boolean[]>([])

  let rafId: number | null = null
  let lastTimestamp: number | null = null

  function tick(timestamp: number) {
    const index = activeNoteIndex.value
    if (lastTimestamp !== null && isOnPitch.value && index !== null) {
      const onPitchMs =
        (noteOnPitchMs[index] ?? 0) + (timestamp - lastTimestamp)
      noteOnPitchMs[index] = onPitchMs

      const dwellNeeded = Math.min(
        MAX_ON_PITCH_MS,
        DWELL_FRACTION * (noteDurationsMs.value[index] ?? 0),
      )
      if (!noteResults.value[index] && onPitchMs >= dwellNeeded) {
        noteResults.value[index] = true
      }
    }
    lastTimestamp = timestamp
    rafId = requestAnimationFrame(tick)
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
  /* noteResults is sparse (only hit notes are set), so the denominator is the
   * melody's note count, not the results array length. */
  const onPitchRatio = computed(() => {
    const total = noteDurationsMs.value.length
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
    }
  })

  onUnmounted(stopTicking)

  return { onPitchRatio, reachedThreshold, correctNoteIndices, reset }
}

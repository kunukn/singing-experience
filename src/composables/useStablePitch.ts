import type { Ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
  snapMidiWithHysteresis,
} from '@/utils/noteUtils'

/* --- Anti-flicker tunables ---
 * Raw detection emits occasional single-frame spikes (pitchy octave/fifth
 * errors, noise transients). These tame them before the pitch drives anything
 * on screen (SingFly's bird, the "See your voice" line), without lagging
 * normal singing. */

/* Rolling-median window. ~80ms ≈ 5 frames at 60fps, so the median outvotes
 * up to two consecutive bad frames regardless of how far off they are — a
 * cheap pre-filter ahead of the temporal dwell below. */
export const STABILIZE_MEDIAN_WINDOW_MS = 80
/* Cold start (no held tone yet): a pitch must persist this long before it is
 * adopted, so a stray blip at the start of a phrase never seeds the bird. */
export const STABILIZE_START_HOLD_MS = 100
/* A "far" jump (≥ STABILIZE_FAR_SEMITONES) away from the held tone must persist
 * this long before it is adopted — a brief octave/fifth spike is ignored, a
 * deliberate leap lands after ~100ms. */
export const STABILIZE_JUMP_HOLD_MS = 100
/* Distance (semitones) that classifies a change from the held tone as a
 * suspicious "far" jump (→ JUMP_HOLD) rather than an ordinary change. 7 = a
 * fifth: catches the classic octave (12) and fifth (7) pitch-detector errors. */
export const STABILIZE_FAR_SEMITONES = 7
/* Universal fluke gate: ANY change of at least STABILIZE_ACCEPT_BAND_SEMITONES
 * (but below FAR) must hold this long before the bird adopts it, so a brief
 * detector spike / background-noise blip (e.g. C3→F#2 for ~30ms) is ignored.
 * Well under every pipe interval, so a deliberate note change is imperceptibly
 * delayed. */
export const STABILIZE_ACCEPT_HOLD_MS = 50
/* Below this semitone distance a change is treated as micro-drift (vibrato,
 * expressive wobble, a smooth glissando the bird chases frame-by-frame) and
 * adopted instantly — sustained singing has zero added latency. It is also the
 * candidate-coherence band: a dwell only completes if successive medians stay
 * within this of the candidate anchor, so a wandering spike never adopts while
 * a steady new note does. */
export const STABILIZE_ACCEPT_BAND_SEMITONES = 2
/* Snap hysteresis: with Snap on, the bird keeps its note until the pitch is
 * more than 60 cents away — 10 cents past the midpoint — so a voice hovering
 * between two notes commits to one instead of flipping every frame and leaving
 * the bird stranded between them. */
export const SNAP_HYSTERESIS_SEMITONES = 0.6

type UseStablePitchOptions = {
  /* Raw detection output (real mic or simulated). Both write a fresh object
   * every animation frame while active and null on silence, so watching
   * .value gives a free per-frame tick with no extra RAF. */
  noteInfo: Ref<NoteInfo | null>
  isClean: Ref<boolean>
  /* Optional voice-range gate. When all three are supplied, a stabilized pitch
   * outside [midiMin - rangePadSemitones, midiMax + rangePadSemitones] is
   * treated as silence — so breath/decay noise the detector mistakes for a
   * fast descending slide can't drag the output out of range. SingFly passes
   * its bird-position freeze band, so it never filters a pitch the bird could
   * legitimately reach. Omit all three to disable. */
  midiMin?: Ref<number>
  midiMax?: Ref<number>
  rangePadSemitones?: Ref<number>
  /* Child-friendly snap: emit a whole semitone instead of the exact pitch,
   * with hysteresis (SNAP_HYSTERESIS_SEMITONES) so a midpoint pitch doesn't
   * flip notes. The median and holds still run on the continuous pitch, so
   * the fluke gating is unchanged — only the output is rounded. */
  isSnapped?: Ref<boolean>
}

type Sample = { time: number; midi: number }

/* Median of the recent sample buffer. Even length averages the two central
 * values — fine for fractional MIDI and keeps the bird from snapping. */
function median(samples: Sample[]): number {
  const sorted = samples.map((s) => s.midi).sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

/**
 * Pitch stabilizer, shared by SingFly's bird and the "See your voice" line. Wraps a raw detection's noteInfo and emits a
 * de-flickered NoteInfo by combining a short rolling median (kills isolated
 * 1–2 frame spikes) with a distance-aware temporal hold:
 *
 * - cold start (no held tone): adopt only after a pitch stays within a
 *   FAR-wide band for STABILIZE_START_HOLD_MS;
 * - micro-drift (< ACCEPT_BAND from the held tone): adopt instantly, so
 *   vibrato, expressive wobble and a smooth glissando (the bird chases it
 *   frame-by-frame) track with no lag;
 * - ordinary change (ACCEPT_BAND ≤ delta < FAR): keep the held tone, adopt
 *   only after the new value persists STABILIZE_ACCEPT_HOLD_MS — THE universal
 *   fluke gate, so a brief detector/noise spike (e.g. C3→F#2 for ~30ms) never
 *   moves the bird, a deliberate note change lands after ~50ms;
 * - far jump (≥ FAR semitones): same, but the longer STABILIZE_JUMP_HOLD_MS —
 *   a brief octave/fifth detector error never moves the bird, a deliberate
 *   leap lands after ~100ms.
 *
 * Timing uses performance.now(). Pitch arrives in real time even on the
 * manual-clock test page (the simulated detector ticks on a real RAF; only
 * pipe scroll is virtual), so the holds behave identically there.
 */
export function useStablePitch(options: UseStablePitchOptions) {
  const stableNoteInfo = ref<NoteInfo | null>(null)

  let samples: Sample[] = []
  let stableMidi: number | null = null
  /* Anchor of the value currently being timed (never re-assigned per frame —
   * it defines the coherence band the pitch must stay inside to keep the hold
   * accumulating: FAR-wide at cold start, ACCEPT_BAND-wide for the dwell).
   * null when no hold is in progress. */
  let candidateMidi: number | null = null
  let candidateSince = 0
  /* The note Snap last emitted, kept for hysteresis. null while snap is off. */
  let snappedMidi: number | null = null

  function reset() {
    samples = []
    stableMidi = null
    candidateMidi = null
    candidateSince = 0
    snappedMidi = null
    stableNoteInfo.value = null
  }

  function emit() {
    if (stableMidi === null) {
      stableNoteInfo.value = null
      return
    }

    if (!options.isSnapped?.value) {
      snappedMidi = null
      /* Passing the last note keeps frequencyToNote's own boundary
       * hysteresis, so a pitch near the midpoint doesn't flip the name. */
      stableNoteInfo.value = frequencyToNote(
        midiToFrequency(stableMidi),
        stableNoteInfo.value?.midiNote,
      )
      return
    }

    snappedMidi = snapMidiWithHysteresis(
      stableMidi,
      snappedMidi,
      SNAP_HYSTERESIS_SEMITONES,
    )
    stableNoteInfo.value = frequencyToNote(midiToFrequency(snappedMidi))
  }

  watch(
    () => options.noteInfo.value,
    (info) => {
      if (!info || !options.isClean.value || info.frequency <= 0) {
        reset()
        return
      }

      const now = performance.now()
      const raw = frequencyToMidi(info.frequency)

      samples.push({ time: now, midi: raw })
      const cutoff = now - STABILIZE_MEDIAN_WINDOW_MS
      samples = samples.filter((s) => s.time >= cutoff)
      const m = median(samples)

      /* Voice-range gate (median-based so an isolated out-of-band octave/fifth
       * spike is outvoted by the median and ignored, but a SUSTAINED
       * out-of-band signal — breath/decay noise the detector slid into a fast
       * descent — drives the median itself out of band and is treated as
       * silence). Falls through to the exact !isClean path: stableNoteInfo →
       * null → useBirdMotion holds the last position, not a noise chase. */
      if (options.midiMin && options.midiMax && options.rangePadSemitones) {
        const pad = options.rangePadSemitones.value
        if (
          m < options.midiMin.value - pad ||
          m > options.midiMax.value + pad
        ) {
          reset()
          return
        }
      }

      if (stableMidi === null) {
        /* Cold start — adopt only after the pitch holds a FAR-wide band. */
        if (
          candidateMidi === null ||
          Math.abs(m - candidateMidi) >= STABILIZE_FAR_SEMITONES
        ) {
          candidateMidi = m
          candidateSince = now
        } else if (now - candidateSince >= STABILIZE_START_HOLD_MS) {
          stableMidi = m
          candidateMidi = null
        }
      } else if (Math.abs(m - stableMidi) < STABILIZE_ACCEPT_BAND_SEMITONES) {
        /* Micro-drift — vibrato / expressive wobble / a smooth glissando the
         * bird chases frame-by-frame: track instantly, no added latency. */
        stableMidi = m
        candidateMidi = null
      } else {
        /* A discontinuous change: an ordinary note change OR a fluke. Hold
         * the old tone until the new value proves itself for the tier's
         * dwell — ACCEPT_HOLD for an ordinary change, the longer JUMP_HOLD
         * for a far (octave/fifth) jump. The candidate re-arms whenever a
         * sample strays > ACCEPT_BAND from it, so a wandering spike never
         * adopts while a coherent new note settles and does. */
        const holdMs =
          Math.abs(m - stableMidi) >= STABILIZE_FAR_SEMITONES
            ? STABILIZE_JUMP_HOLD_MS
            : STABILIZE_ACCEPT_HOLD_MS
        if (
          candidateMidi === null ||
          Math.abs(m - candidateMidi) >= STABILIZE_ACCEPT_BAND_SEMITONES
        ) {
          candidateMidi = m
          candidateSince = now
        } else if (now - candidateSince >= holdMs) {
          stableMidi = m
          candidateMidi = null
        }
      }

      emit()
    },
  )

  return { stableNoteInfo }
}

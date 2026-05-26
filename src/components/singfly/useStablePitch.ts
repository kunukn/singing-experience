import type { Ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
} from '@/utils/noteUtils'

import {
  STABILIZE_ACCEPT_BAND_SEMITONES,
  STABILIZE_ACCEPT_HOLD_MS,
  STABILIZE_FAR_SEMITONES,
  STABILIZE_JUMP_HOLD_MS,
  STABILIZE_MEDIAN_WINDOW_MS,
  STABILIZE_START_HOLD_MS,
} from './singFlyConstants'
import { rangePadSemitones } from './singFlyGeometry'

type UseStablePitchOptions = {
  /* Raw detection output (real mic or simulated). Both write a fresh object
   * every animation frame while active and null on silence, so watching
   * .value gives a free per-frame tick with no extra RAF. */
  noteInfo: Ref<NoteInfo | null>
  isClean: Ref<boolean>
  /* Optional voice-range gate. When all three are supplied, a stabilized pitch
   * outside [midiMin - rangePad, midiMax + rangePad] is treated as silence —
   * so breath/decay noise the detector mistakes for a fast descending slide
   * can't drag the bird out of range; the bird holds its last position
   * instead. The band is the bird-position freeze band, so it never filters a
   * pitch the bird could legitimately reach. Omit all three to disable. */
  midiMin?: Ref<number>
  midiMax?: Ref<number>
  gapHalfSemitones?: Ref<number>
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
 * Singfly-local pitch stabilizer. Wraps a raw detection's noteInfo and emits a
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

  function reset() {
    samples = []
    stableMidi = null
    candidateMidi = null
    candidateSince = 0
    stableNoteInfo.value = null
  }

  function emit() {
    stableNoteInfo.value =
      stableMidi === null ? null : frequencyToNote(midiToFrequency(stableMidi))
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
      if (options.midiMin && options.midiMax && options.gapHalfSemitones) {
        const pad = rangePadSemitones(options.gapHalfSemitones.value)
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

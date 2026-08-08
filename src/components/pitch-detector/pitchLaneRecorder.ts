import type { NoteInfo } from '@/utils/noteUtils'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { HISTORY_RETENTION_MS, PAUSE_GAP_MS } from './pitchConstants'

/*
 * The recording state machine for ONE singing voice: the sample buffer that
 * becomes the history spline, plus the sustained-note markers drawn along it.
 *
 * Extracted from PitchHistoryCanvas so the canvas can run two of these side by
 * side in duet mode — the buffer and the marker hysteresis both have to be
 * per-voice, and eight module-level `let`s do not duplicate cleanly. Being pure
 * (no Vue, no canvas) it is also directly testable, which the inline version
 * was not.
 *
 * Deliberately mutable and mutated in place: the canvas render loop reads these
 * arrays every frame, so allocating a fresh one per sample would churn far more
 * than the drawing itself.
 */

export type PitchSample = {
  /* Fractional, derived from the smoothed frequency rather than rounded to a
   * semitone — integer MIDI would draw the spline as a staircase. */
  midiNote: number
  timestamp: number
  isClean: boolean
  cents: number
}

export type NoteMarker = {
  midiNote: number
  timestamp: number
  label: string
  /* Repeat markers along one held note draw a dot only; the first carries the
   * name, so a sustained note is not spelled out over and over. */
  showLabel: boolean
}

export type PitchLaneRecorder = {
  readonly samples: PitchSample[]
  readonly noteMarkers: NoteMarker[]
  push: (noteInfo: NoteInfo, timestampMs: number) => void
  reset: () => void
}

/* How long a note must be held before a label marker appears on the chart */
const SUSTAINED_THRESHOLD_MS = 200

/* Shorter threshold after a quick note transition — feels more responsive during runs */
const SUSTAINED_PASSING_THRESHOLD_MS = 150

export function createPitchLaneRecorder(): PitchLaneRecorder {
  const samples: PitchSample[] = []
  const noteMarkers: NoteMarker[] = []

  let sustainedMidi: number | null = null
  let sustainedStartTime = 0
  let lastMarkerTime = 0
  let lastSampleTime = 0
  let isFirstMarkerPending = true
  let wasTransition = false

  function prune(now: number) {
    const cutoff = now - HISTORY_RETENTION_MS

    while (samples.length > 0 && samples[0].timestamp < cutoff) {
      samples.shift()
    }

    while (noteMarkers.length > 0 && noteMarkers[0].timestamp < cutoff) {
      noteMarkers.shift()
    }
  }

  function push(noteInfo: NoteInfo, timestampMs: number) {
    /*
     * MIDI formula on the already-smoothed frequency for sub-semitone precision,
     * avoiding the integer staircase Math.round in frequencyToNote would leave.
     */
    const fractionalMidi = 12 * Math.log2(noteInfo.frequency / 440) + 69

    samples.push({
      midiNote: fractionalMidi,
      timestamp: timestampMs,
      isClean: true,
      cents: noteInfo.cents,
    })

    const isPause =
      lastSampleTime > 0 && timestampMs - lastSampleTime > PAUSE_GAP_MS
    lastSampleTime = timestampMs

    /* Sustained-note detection — a marker only lands once the note has been
     * held past the threshold, so passing notes in a run don't each get one. */
    const roundedMidi = Math.round(fractionalMidi)
    if (roundedMidi !== sustainedMidi || isPause) {
      wasTransition =
        sustainedMidi !== null &&
        timestampMs - sustainedStartTime < SUSTAINED_THRESHOLD_MS
      sustainedMidi = roundedMidi
      sustainedStartTime = timestampMs
      lastMarkerTime = 0
      isFirstMarkerPending = true
    } else {
      const firstMarkerThreshold = wasTransition
        ? SUSTAINED_PASSING_THRESHOLD_MS
        : SUSTAINED_THRESHOLD_MS

      if (
        isFirstMarkerPending &&
        timestampMs - sustainedStartTime >= firstMarkerThreshold
      ) {
        noteMarkers.push({
          midiNote: roundedMidi,
          timestamp: timestampMs,
          label: midiToNoteLabel(roundedMidi).label,
          showLabel: true,
        })
        lastMarkerTime = timestampMs
        isFirstMarkerPending = false
      } else if (
        !isFirstMarkerPending &&
        timestampMs - lastMarkerTime >= SUSTAINED_THRESHOLD_MS
      ) {
        noteMarkers.push({
          midiNote: roundedMidi,
          timestamp: timestampMs,
          label: midiToNoteLabel(roundedMidi).label,
          showLabel: false,
        })
        lastMarkerTime = timestampMs
      }
    }

    prune(timestampMs)
  }

  function reset() {
    samples.length = 0
    noteMarkers.length = 0
    sustainedMidi = null
    sustainedStartTime = 0
    lastMarkerTime = 0
    lastSampleTime = 0
    isFirstMarkerPending = true
    wasTransition = false
  }

  return { samples, noteMarkers, push, reset }
}

/* The wall-clock span covered by every lane that recorded anything, so the
 * replay scrub and the recorded-duration readout agree across both voices.
 * Null when nothing was recorded at all. */
export function pitchLaneExtent(
  lanes: readonly PitchLaneRecorder[],
): { firstTimestamp: number; lastTimestamp: number } | null {
  const recorded = lanes.filter((lane) => lane.samples.length > 0)
  if (recorded.length === 0) return null

  return {
    firstTimestamp: Math.min(
      ...recorded.map((lane) => lane.samples[0].timestamp),
    ),
    lastTimestamp: Math.max(
      ...recorded.map(
        (lane) => lane.samples[lane.samples.length - 1].timestamp,
      ),
    ),
  }
}

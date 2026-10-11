import { CLEAN_CENTS, OFF_CENTS } from '@/utils/pitchColors'
import { PAUSE_GAP_MS } from './pitchConstants'

/*
 * The "which tone is the singer working on" state machine behind the focus
 * tab. The singer picks the tone simply by singing it: a semitone held for
 * holdMs becomes the focus, and the chart zooms to it.
 *
 * Kept free of Vue and timers, like pitchLaneRecorder, so the timing rules can
 * be tested with hand-written timestamps.
 */

export type FocusToneStats = {
  /* Voiced time on the focus tone, gaps excluded */
  holdMs: number
  /* Signed: positive = sharp, negative = flat */
  averageCents: number
  /* Standard deviation of the cents — how steady the tone is */
  wobbleCents: number
  /* Share of samples within CLEAN_CENTS, 0–100 */
  inTunePercent: number
}

export type FocusToneTracker = {
  readonly focusMidi: number | null
  readonly isLocked: boolean
  readonly stats: FocusToneStats
  /* Fractional MIDI from the smoothed frequency, or null for silence */
  push: (midi: number | null, timestampMs: number) => void
  setLocked: (isLocked: boolean) => void
  /* Fresh stats for a new take, keeping the focus tone */
  resetStats: () => void
  reset: () => void
}

/* How long a new semitone must be held before the chart re-centres on it */
export const DEFAULT_FOCUS_HOLD_MS = 500

const EMPTY_STATS: FocusToneStats = {
  holdMs: 0,
  averageCents: 0,
  wobbleCents: 0,
  inTunePercent: 0,
}

export function createFocusTracker({
  holdMs = DEFAULT_FOCUS_HOLD_MS,
}: { holdMs?: number } = {}): FocusToneTracker {
  let focusMidi: number | null = null
  let isLocked = false

  let candidateMidi: number | null = null
  let candidateHeldMs = 0

  let lastTimestamp: number | null = null

  /* Running sums, so stats stay O(1) per frame over a long held tone */
  let sampleCount = 0
  let centsSum = 0
  let centsSquaredSum = 0
  let inTuneCount = 0
  let voicedMs = 0

  function resetStats() {
    sampleCount = 0
    centsSum = 0
    centsSquaredSum = 0
    inTuneCount = 0
    voicedMs = 0
  }

  function resetCandidate() {
    candidateMidi = null
    candidateHeldMs = 0
  }

  function trackCandidate(roundedMidi: number, elapsedMs: number) {
    if (isLocked || roundedMidi === focusMidi) {
      resetCandidate()

      return
    }

    if (roundedMidi === candidateMidi) {
      candidateHeldMs += elapsedMs
    } else {
      candidateMidi = roundedMidi
      candidateHeldMs = 0
    }
    if (candidateHeldMs < holdMs) return

    focusMidi = roundedMidi
    resetCandidate()
    resetStats()
  }

  function recordStats(midi: number, elapsedMs: number) {
    if (focusMidi === null) return

    const cents = (midi - focusMidi) * 100 // 100 cents per semitone
    /* Glides and neighbouring notes say nothing about how clean the focus
     * tone is — only frames that are still "on" it count. */
    if (Math.abs(cents) > OFF_CENTS) return

    sampleCount++
    centsSum += cents
    centsSquaredSum += cents * cents
    if (Math.abs(cents) <= CLEAN_CENTS) inTuneCount++
    voicedMs += elapsedMs
  }

  return {
    get focusMidi() {
      return focusMidi
    },
    get isLocked() {
      return isLocked
    },
    get stats() {
      if (sampleCount === 0) return { ...EMPTY_STATS, holdMs: voicedMs }

      const averageCents = centsSum / sampleCount
      /* Population variance via E[x²] − E[x]²; clamped since float error can
       * dip it a hair below zero for a perfectly steady tone. */
      const variance = Math.max(
        0,
        centsSquaredSum / sampleCount - averageCents * averageCents,
      )

      return {
        holdMs: voicedMs,
        averageCents,
        wobbleCents: Math.sqrt(variance),
        inTunePercent: (inTuneCount / sampleCount) * 100,
      }
    },
    push(midi, timestampMs) {
      const elapsedMs = lastTimestamp === null ? 0 : timestampMs - lastTimestamp
      /* A silence long enough to break the chart trail also breaks timing,
       * so a pause never counts towards hold time. */
      const voicedElapsedMs = elapsedMs > PAUSE_GAP_MS ? 0 : elapsedMs

      if (midi === null) {
        lastTimestamp = null

        return
      }

      lastTimestamp = timestampMs
      trackCandidate(Math.round(midi), voicedElapsedMs)
      recordStats(midi, voicedElapsedMs)
    },
    setLocked(value) {
      isLocked = value && focusMidi !== null
      if (isLocked) resetCandidate()
    },
    resetStats,
    reset() {
      focusMidi = null
      isLocked = false
      lastTimestamp = null
      resetCandidate()
      resetStats()
    },
  }
}

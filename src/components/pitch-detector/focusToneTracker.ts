import { CLEAN_CENTS, CLOSE_CENTS, OFF_CENTS } from '@/utils/pitchColors'
import { PAUSE_GAP_MS } from './pitchConstants'

/*
 * The "which tone is the singer working on" state machine behind the focus
 * tab. The singer picks the tone simply by singing it: a semitone held for
 * holdMs becomes the focus, and the chart zooms to it.
 *
 * Kept free of Vue and timers, like pitchLaneRecorder, so the timing rules can
 * be tested with hand-written timestamps.
 */

/*
 * Every field but holdMs is a fading average weighted toward the last few
 * seconds (see STATS_HALF_LIFE_MS), so it describes how the tone sounds now
 * rather than over the whole take.
 */
export type FocusToneStats = {
  /* Voiced time on the focus tone, gaps excluded — the whole take */
  holdMs: number
  /* Signed: positive = sharp, negative = flat */
  averageCents: number
  /* Standard deviation of the heard cents — how steady the tone is */
  wobbleCents: number
  /* Share of samples whose heard pitch is within CLOSE_CENTS, 0–100 —
   * the band listeners accept as in tune */
  onPitchPercent: number
  /* Share within CLEAN_CENTS, 0–100 — the studio-tight stretch goal */
  spotOnPercent: number
}

export type FocusToneTracker = {
  readonly focusMidi: number | null
  readonly isLocked: boolean
  readonly stats: FocusToneStats
  /* Fractional MIDI from the smoothed frequency, or null for silence */
  push: (midi: number | null, timestampMs: number) => void
  setLocked: (isLocked: boolean) => void
  /* Focus and lock a chosen tone at once — no hold needed */
  lockTo: (midi: number) => void
  /* Fresh stats for a new take, keeping the focus tone */
  resetStats: () => void
  reset: () => void
}

/* How long a new semitone must be held before the chart re-centres on it */
export const DEFAULT_FOCUS_HOLD_MS = 400

/*
 * Pitch is judged on a rolling mean over this window rather than raw frames.
 * Vibrato runs at 5–7 Hz, so 200 ms spans about one cycle — roughly how a
 * listener hears it: a ±50¢ vibrato centred on the note sounds in tune.
 */
export const HEARD_PITCH_WINDOW_MS = 200

/*
 * A frame's weight in the stats halves every this many ms of voiced singing,
 * so a poor start fades out within seconds instead of dragging the whole take:
 * after 10 s of good singing, the earlier part weighs about 1%.
 */
export const STATS_HALF_LIFE_MS = 1500

const EMPTY_STATS: FocusToneStats = {
  holdMs: 0,
  averageCents: 0,
  wobbleCents: 0,
  onPitchPercent: 0,
  spotOnPercent: 0,
}

export function createFocusTracker({
  holdMs = DEFAULT_FOCUS_HOLD_MS,
  statsHalfLifeMs = STATS_HALF_LIFE_MS,
}: { holdMs?: number; statsHalfLifeMs?: number } = {}): FocusToneTracker {
  let focusMidi: number | null = null
  let isLocked = false

  let candidateMidi: number | null = null
  let candidateHeldMs = 0

  let lastTimestamp: number | null = null

  /* Fading running sums, so stats stay O(1) per frame over a long held tone */
  let weightSum = 0
  let centsSum = 0
  let heardCentsSum = 0
  let heardCentsSquaredSum = 0
  let onPitchWeight = 0
  let spotOnWeight = 0
  let voicedMs = 0

  /* The last HEARD_PITCH_WINDOW_MS of counted frames, with a running sum */
  let heardWindow: { timestamp: number; cents: number }[] = []
  let heardWindowSum = 0

  function resetHeardWindow() {
    heardWindow = []
    heardWindowSum = 0
  }

  function resetStats() {
    weightSum = 0
    centsSum = 0
    heardCentsSum = 0
    heardCentsSquaredSum = 0
    onPitchWeight = 0
    spotOnWeight = 0
    voicedMs = 0
    resetHeardWindow()
  }

  /* Adds a frame to the window and returns the window's mean */
  function heardCentsFor(cents: number, timestampMs: number): number {
    heardWindow.push({ timestamp: timestampMs, cents })
    heardWindowSum += cents
    while (heardWindow[0].timestamp <= timestampMs - HEARD_PITCH_WINDOW_MS) {
      heardWindowSum -= heardWindow.shift()!.cents
    }

    return heardWindowSum / heardWindow.length
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

  function recordStats(midi: number, elapsedMs: number, timestampMs: number) {
    if (focusMidi === null) return

    const cents = (midi - focusMidi) * 100 // 100 cents per semitone
    /* Glides and neighbouring notes say nothing about how clean the focus
     * tone is — only frames that are still "on" it count. */
    if (Math.abs(cents) > OFF_CENTS) return

    const heardCents = heardCentsFor(cents, timestampMs)

    /* Ages every earlier frame by this frame's voiced time, then adds it at
     * full weight. Pauses and skipped frames add no time, so they fade
     * nothing. */
    const fade = 2 ** (-elapsedMs / statsHalfLifeMs)
    weightSum = weightSum * fade + 1
    centsSum = centsSum * fade + cents
    heardCentsSum = heardCentsSum * fade + heardCents
    heardCentsSquaredSum = heardCentsSquaredSum * fade + heardCents * heardCents
    onPitchWeight =
      onPitchWeight * fade + (Math.abs(heardCents) <= CLOSE_CENTS ? 1 : 0)
    spotOnWeight =
      spotOnWeight * fade + (Math.abs(heardCents) <= CLEAN_CENTS ? 1 : 0)
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
      if (weightSum === 0) return { ...EMPTY_STATS, holdMs: voicedMs }

      const heardAverage = heardCentsSum / weightSum
      /* Population variance via E[x²] − E[x]²; clamped since float error can
       * dip it a hair below zero for a perfectly steady tone. */
      const variance = Math.max(
        0,
        heardCentsSquaredSum / weightSum - heardAverage * heardAverage,
      )

      return {
        holdMs: voicedMs,
        averageCents: centsSum / weightSum,
        wobbleCents: Math.sqrt(variance),
        onPitchPercent: (onPitchWeight / weightSum) * 100,
        spotOnPercent: (spotOnWeight / weightSum) * 100,
      }
    },
    push(midi, timestampMs) {
      const elapsedMs = lastTimestamp === null ? 0 : timestampMs - lastTimestamp
      /* A silence long enough to break the chart trail also breaks timing,
       * so a pause never counts towards hold time. */
      const voicedElapsedMs = elapsedMs > PAUSE_GAP_MS ? 0 : elapsedMs

      if (midi === null) {
        lastTimestamp = null
        resetHeardWindow()

        return
      }

      /* A new phrase is heard fresh — the last one's tail must not colour it */
      if (elapsedMs > PAUSE_GAP_MS) resetHeardWindow()

      lastTimestamp = timestampMs
      trackCandidate(Math.round(midi), voicedElapsedMs)
      recordStats(midi, voicedElapsedMs, timestampMs)
    },
    setLocked(value) {
      isLocked = value && focusMidi !== null
      if (isLocked) resetCandidate()
    },
    lockTo(midi) {
      focusMidi = midi
      isLocked = true
      resetCandidate()
      resetStats()
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

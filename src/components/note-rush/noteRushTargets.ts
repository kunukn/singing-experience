import type { Difficulty } from '@/constants/difficulty'
import { randomMidiStep, type RandomSource } from '@/utils/randomMidi'

export const DEFAULT_DIFFICULTY: Difficulty = 'easy'

/* Time budget for one note: a round holds one note for each full interval of
 * its game length. Easy leaves 3 seconds to breathe and find the pitch; hard
 * packs a note into every 1.5 seconds, so more of them overlap. */
export const DIFFICULTY_NOTE_INTERVAL_MS: Record<Difficulty, number> = {
  easy: 3000,
  normal: 2000,
  hard: 1500,
}

/* How far off a note the singer may be and still score. 50¢ is half a
 * semitone, the widest window that can't also catch the note next door. Easy
 * goes past that to 75¢ on purpose: a near miss counts, at the cost that one
 * pitch can catch two notes a semitone apart. This is scoring tolerance, not
 * the "how in tune" tiers of pitchColors.ts. */
export const DIFFICULTY_HIT_TOLERANCE_CENTS: Record<Difficulty, number> = {
  easy: 75,
  normal: 50,
  hard: 50,
}

/* Largest jump between two notes in a row, in semitones. Easy stays within a
 * major third (the same cap SingFly uses), normal within a fifth, hard may
 * cross the whole voice range. */
export const DIFFICULTY_MAX_NOTE_STEP_SEMITONES: Record<Difficulty, number> = {
  easy: 4,
  normal: 7,
  hard: Infinity,
}

/* How far a note may move from its evenly spaced slot, as a fraction of the
 * gap between slots. 0 keeps a steady beat. 0.35 stays under half a gap, so
 * two neighbours can never swap places or land together. Hard has no slots:
 * every note takes a random time in the round. */
const DIFFICULTY_TIMING_JITTER_RATIO: Record<Difficulty, number | null> = {
  easy: 0,
  normal: 0.35,
  hard: null,
}

/* Minimum gap between two notes in a row. A singer can only sing one note at
 * a time, so two targets must not land at the exact same moment — 100 ms is
 * enough separation to keep them visually distinct. */
export const MIN_TARGET_GAP_MS = 100

export type ScheduledTarget = {
  /* Milliseconds after the first note */
  offsetMs: number
  midi: number
}

type TargetScheduleOptions = {
  durationMs: number
  /* Latest offset a note may take and still be catchable inside the round */
  maxOffsetMs: number
  difficulty: Difficulty
  midiMin: number
  midiMax: number
  random?: RandomSource
}

function createOffsets(
  count: number,
  maxOffsetMs: number,
  jitterRatio: number | null,
  random: RandomSource,
): number[] {
  /* The first note always comes at once, so the playing panel isn't empty. */
  if (jitterRatio === null) {
    return Array.from({ length: count }, (_, index) =>
      index === 0 ? 0 : random() * maxOffsetMs,
    ).toSorted((a, b) => a - b)
  }

  const slotMs = count > 1 ? maxOffsetMs / (count - 1) : 0

  return Array.from({ length: count }, (_, index) => {
    if (index === 0) return 0

    const jitterMs = (random() * 2 - 1) * jitterRatio * slotMs

    return Math.min(maxOffsetMs, index * slotMs + jitterMs)
  })
}

/* The notes of one round, in the order the singer meets them. */
export function generateTargetSchedule({
  durationMs,
  maxOffsetMs,
  difficulty,
  midiMin,
  midiMax,
  random = Math.random,
}: TargetScheduleOptions): ScheduledTarget[] {
  const count = Math.max(
    1,
    Math.floor(durationMs / DIFFICULTY_NOTE_INTERVAL_MS[difficulty]),
  )

  const offsets = createOffsets(
    count,
    maxOffsetMs,
    DIFFICULTY_TIMING_JITTER_RATIO[difficulty],
    random,
  )

  /* Walking in order and bumping forward keeps the earlier notes where they
   * were while guaranteeing no visual pile-up. */
  for (let i = 1; i < offsets.length; i++) {
    offsets[i] = Math.max(offsets[i], offsets[i - 1] + MIN_TARGET_GAP_MS)
  }

  /* Notes are picked in time order, so the step cap and the no-repeat rule
   * apply to the order the singer hears. */
  const maxStep = DIFFICULTY_MAX_NOTE_STEP_SEMITONES[difficulty]
  let previousMidi: number | null = null

  return offsets.map((offsetMs) => {
    const midi = randomMidiStep(midiMin, midiMax, previousMidi, maxStep, random)
    previousMidi = midi

    return { offsetMs, midi }
  })
}

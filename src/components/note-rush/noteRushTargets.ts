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
 * major third (the same cap SingFly uses), normal within a fifth, hard within
 * an octave: the widest leap a singer can be asked to land in under a second. */
export const DIFFICULTY_MAX_NOTE_STEP_SEMITONES: Record<Difficulty, number> = {
  easy: 4,
  normal: 7,
  hard: 12,
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
 * a time, so two targets must not land at the exact same moment. On easy and
 * normal the slots already keep notes apart, and 100 ms only keeps them
 * visually distinct. Hard has no slots, so the gap is what keeps a perfect
 * score possible: 600 ms covers the longest hold (200 ms) plus 400 ms to move
 * to the next note, however the notes fall. */
export const DIFFICULTY_MIN_GAP_MS: Record<Difficulty, number> = {
  easy: 100,
  normal: 100,
  hard: 600,
}

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
  minGapMs: number,
  random: RandomSource,
): number[] {
  /* The first note always comes at once, so the playing panel isn't empty. */
  if (jitterRatio === null) {
    /* Random times in what is left of the round once every gap is set aside,
     * then the gaps are put back. Every spread that keeps the gap is equally
     * likely, and no note is pushed past the end of the round. */
    const freeMs = Math.max(0, maxOffsetMs - (count - 1) * minGapMs)

    return Array.from({ length: count }, (_, index) =>
      index === 0 ? 0 : random() * freeMs,
    )
      .toSorted((a, b) => a - b)
      .map((offsetMs, index) => offsetMs + index * minGapMs)
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

  const minGapMs = DIFFICULTY_MIN_GAP_MS[difficulty]
  const offsets = createOffsets(
    count,
    maxOffsetMs,
    DIFFICULTY_TIMING_JITTER_RATIO[difficulty],
    minGapMs,
    random,
  )

  /* Walking in order and bumping forward keeps the earlier notes where they
   * were while guaranteeing the gap, for rounds too short to fit their slots. */
  for (let i = 1; i < offsets.length; i++) {
    offsets[i] = Math.max(offsets[i], offsets[i - 1] + minGapMs)
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

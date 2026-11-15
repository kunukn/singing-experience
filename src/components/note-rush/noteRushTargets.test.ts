import { describe, expect, test } from 'vitest'

import { DIFFICULTY_OPTIONS, type Difficulty } from '@/constants/difficulty'
import {
  DIFFICULTY_MAX_NOTE_STEP_SEMITONES,
  generateTargetSchedule,
  MIN_TARGET_GAP_MS,
} from './noteRushTargets'

/* C2 to C4: wide enough that an uncapped pick can jump two octaves */
const MIDI_MIN = 36
const MIDI_MAX = 60
const DURATION_MS = 20_000
const MAX_OFFSET_MS = 13_750

/* Mulberry32: a small seeded generator, so a failing round can be replayed. */
function createRandom(seed: number) {
  let state = seed

  return () => {
    state = (state + 0x6d2b79f5) | 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

const createSchedule = (difficulty: Difficulty, seed = 1) =>
  generateTargetSchedule({
    durationMs: DURATION_MS,
    maxOffsetMs: MAX_OFFSET_MS,
    difficulty,
    midiMin: MIDI_MIN,
    midiMax: MIDI_MAX,
    random: createRandom(seed),
  })

const SEEDS = Array.from({ length: 50 }, (_, index) => index + 1)

const getGaps = (values: number[]) =>
  values.slice(1).map((value, index) => value - values[index])

describe('generateTargetSchedule', () => {
  test.each([
    { difficulty: 'easy', durationMs: 5000, count: 1 },
    { difficulty: 'easy', durationMs: 20_000, count: 6 },
    { difficulty: 'easy', durationMs: 30_000, count: 10 },
    { difficulty: 'normal', durationMs: 5000, count: 2 },
    { difficulty: 'normal', durationMs: 20_000, count: 10 },
    { difficulty: 'normal', durationMs: 30_000, count: 15 },
    { difficulty: 'hard', durationMs: 5000, count: 3 },
    { difficulty: 'hard', durationMs: 20_000, count: 13 },
    { difficulty: 'hard', durationMs: 30_000, count: 20 },
  ] as const)(
    'returns $count notes for $durationMs ms on $difficulty',
    ({ difficulty, durationMs, count }) => {
      const schedule = generateTargetSchedule({
        durationMs,
        maxOffsetMs: MAX_OFFSET_MS,
        difficulty,
        midiMin: MIDI_MIN,
        midiMax: MIDI_MAX,
      })

      expect(schedule).toHaveLength(count)
    },
  )

  test('spaces the notes evenly on easy', () => {
    const offsets = createSchedule('easy').map((target) => target.offsetMs)

    for (const gap of getGaps(offsets)) {
      expect(gap).toBeCloseTo(MAX_OFFSET_MS / 5, 5)
    }
  })

  test('keeps each note near its even slot on normal', () => {
    const slotMs = MAX_OFFSET_MS / 9

    for (const seed of SEEDS) {
      createSchedule('normal', seed).forEach((target, index) => {
        expect(Math.abs(target.offsetMs - index * slotMs)).toBeLessThan(
          slotMs / 2,
        )
      })
    }
  })

  test.each(['easy', 'normal'] as const)(
    'never jumps further than the %s cap',
    (difficulty) => {
      const maxStep = DIFFICULTY_MAX_NOTE_STEP_SEMITONES[difficulty]

      for (const seed of SEEDS) {
        const midis = createSchedule(difficulty, seed).map(
          (target) => target.midi,
        )

        for (const step of getGaps(midis)) {
          expect(Math.abs(step)).toBeLessThanOrEqual(maxStep)
        }
      }
    },
  )

  test('jumps further than the normal cap on hard', () => {
    const steps = SEEDS.flatMap((seed) =>
      getGaps(createSchedule('hard', seed).map((target) => target.midi)),
    )

    expect(Math.max(...steps.map(Math.abs))).toBeGreaterThan(
      DIFFICULTY_MAX_NOTE_STEP_SEMITONES.normal,
    )
  })

  test.each(DIFFICULTY_OPTIONS)(
    'keeps every %s round playable',
    (difficulty) => {
      for (const seed of SEEDS) {
        const schedule = createSchedule(difficulty, seed)
        const offsets = schedule.map((target) => target.offsetMs)
        const midis = schedule.map((target) => target.midi)

        expect(offsets[0]).toBe(0)
        expect(Math.min(...getGaps(offsets))).toBeGreaterThanOrEqual(
          MIN_TARGET_GAP_MS,
        )
        expect(getGaps(midis)).not.toContain(0)
        expect(Math.min(...midis)).toBeGreaterThanOrEqual(MIDI_MIN)
        expect(Math.max(...midis)).toBeLessThanOrEqual(MIDI_MAX)
      }
    },
  )

  test.each(['easy', 'normal'] as const)(
    'ends every %s round inside the game length',
    (difficulty) => {
      for (const seed of SEEDS) {
        const last = createSchedule(difficulty, seed).at(-1)

        expect(last?.offsetMs).toBeLessThanOrEqual(MAX_OFFSET_MS)
      }
    },
  )
})

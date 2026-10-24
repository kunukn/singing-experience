import { describe, expect, test } from 'vitest'
import {
  FOCUS_LEVEL_RULES,
  focusLevelFor,
  focusTipFor,
  LEVEL_MIN_HOLD_MS,
} from './focusLevel'
import type { FocusToneStats } from './focusToneTracker'

/* A clean, centred, long-enough take; each test bends the field it is about */
function take(overrides: Partial<FocusToneStats> = {}): FocusToneStats {
  return {
    holdMs: LEVEL_MIN_HOLD_MS,
    averageCents: 0,
    wobbleCents: 5,
    onPitchPercent: 100,
    spotOnPercent: 100,
    ...overrides,
  }
}

describe('focusLevelFor', () => {
  test('should give no level before the minimum hold', () => {
    expect(focusLevelFor(take({ holdMs: LEVEL_MIN_HOLD_MS - 1 }))).toBe(null)
  })

  test.each([
    [100, 100, 'pitchPerfect'],
    [95, 80, 'pitchPerfect'],
    [95, 79, 'leadSinger'],
    [90, 50, 'leadSinger'],
    [89, 100, 'stageReady'],
    [75, 0, 'stageReady'],
    [74, 0, 'niceAndClose'],
    [60, 0, 'niceAndClose'],
    [59, 0, 'findingIt'],
    [40, 0, 'findingIt'],
    [39, 0, 'warmingUp'],
    [0, 0, 'warmingUp'],
  ])(
    'should rate %i%% on pitch and %i%% spot on as %s',
    (onPitchPercent, spotOnPercent, level) => {
      expect(focusLevelFor(take({ onPitchPercent, spotOnPercent }))).toBe(level)
    },
  )

  test('should keep a near-perfect on-pitch take below lead singer until it is spot on half the time', () => {
    expect(focusLevelFor(take({ onPitchPercent: 99, spotOnPercent: 49 }))).toBe(
      'stageReady',
    )
  })
})

describe('FOCUS_LEVEL_RULES', () => {
  /* focusLevelFor takes the first rule met, so a lower rung listed above a
   * higher one would shadow it */
  test('should list rungs highest first, ending at a catch-all warming up', () => {
    const onPitchThresholds = FOCUS_LEVEL_RULES.map(
      (rule) => rule.minOnPitchPercent,
    )

    expect(onPitchThresholds).toEqual(
      onPitchThresholds.toSorted((a, b) => b - a),
    )
    expect(FOCUS_LEVEL_RULES.at(-1)).toEqual({
      level: 'warmingUp',
      minOnPitchPercent: 0,
      minSpotOnPercent: 0,
    })
  })
})

describe('focusTipFor', () => {
  test('should give no tip before any singing', () => {
    expect(focusTipFor(take({ holdMs: 0 }), null)).toBe(null)
  })

  test('should ask to keep holding before a level is given', () => {
    const stats = take({ holdMs: 1000 })

    expect(focusTipFor(stats, focusLevelFor(stats))).toBe('keepHolding')
  })

  test('should praise a pitch perfect take even with an offset', () => {
    const stats = take({ averageCents: 12 })

    expect(focusTipFor(stats, 'pitchPerfect')).toBe('perfect')
  })

  test('should name sharp or flat before steadiness', () => {
    expect(
      focusTipFor(take({ averageCents: 14, wobbleCents: 30 }), 'stageReady'),
    ).toBe('sharp')
    expect(
      focusTipFor(take({ averageCents: -14, wobbleCents: 30 }), 'stageReady'),
    ).toBe('flat')
  })

  test('should ask for a steadier tone when centred but wobbly', () => {
    expect(
      focusTipFor(take({ averageCents: 3, wobbleCents: 20 }), 'findingIt'),
    ).toBe('steady')
  })

  test.each([
    { level: 'warmingUp', expected: 'almost' },
    { level: 'findingIt', expected: 'almost' },
    { level: 'niceAndClose', expected: 'almost' },
    { level: 'stageReady', expected: 'aimMiddle' },
    { level: 'leadSinger', expected: 'nearlyPerfect' },
  ] as const)(
    'should give a $level take that is centred and steady the "$expected" tip',
    ({ level, expected }) => {
      expect(focusTipFor(take({ averageCents: 3 }), level)).toBe(expected)
    },
  )

  test('should name sharp before the rung tip on a lead singer take', () => {
    expect(focusTipFor(take({ averageCents: 14 }), 'leadSinger')).toBe('sharp')
  })
})

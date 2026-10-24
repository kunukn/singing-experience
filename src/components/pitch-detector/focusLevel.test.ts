import { describe, expect, test } from 'vitest'
import {
  FOCUS_LEVEL_RULES,
  focusLevelFor,
  focusTipFor,
  LEVEL_MIN_HOLD_MS,
  type FocusLevel,
} from './focusLevel'
import { createFocusTracker, type FocusToneStats } from './focusToneTracker'

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

describe('focusLevelFor - hysteresis', () => {
  test('should climb as soon as a higher rung is met', () => {
    expect(
      focusLevelFor(
        take({ onPitchPercent: 95, spotOnPercent: 80 }),
        'stageReady',
      ),
    ).toBe('pitchPerfect')
  })

  test('should keep the current rung through a small dip', () => {
    expect(focusLevelFor(take({ onPitchPercent: 87 }), 'leadSinger')).toBe(
      'leadSinger',
    )
    expect(
      focusLevelFor(
        take({ onPitchPercent: 90, spotOnPercent: 46 }),
        'leadSinger',
      ),
    ).toBe('leadSinger')
  })

  test('should drop once the take falls clearly below the current rung', () => {
    expect(focusLevelFor(take({ onPitchPercent: 84 }), 'leadSinger')).toBe(
      'stageReady',
    )
    expect(
      focusLevelFor(
        take({ onPitchPercent: 90, spotOnPercent: 44 }),
        'leadSinger',
      ),
    ).toBe('stageReady')
  })

  test('should still give no level before the minimum hold', () => {
    expect(
      focusLevelFor(take({ holdMs: LEVEL_MIN_HOLD_MS - 1 }), 'pitchPerfect'),
    ).toBe(null)
  })
})

describe('focusLevelFor - recovering from a poor start', () => {
  /* ~60 fps frames; the level is re-read every 200 ms, as useFocusTone does */
  const FRAME_MS = 16
  const REFRESH_MS = 200
  const A3 = 57

  test('should reach pitch perfect within 7 s of singing dead on after 10 s off pitch', () => {
    const tracker = createFocusTracker({ holdMs: 0 })
    tracker.lockTo(A3)
    let level: FocusLevel | null = null
    const levelAt = new Map<number, FocusLevel | null>()

    for (let timestamp = 0; timestamp <= 20_000; timestamp += FRAME_MS) {
      /* +30 cents: counted, but never on pitch */
      tracker.push(timestamp < 10_000 ? A3 + 0.3 : A3, timestamp)
      if (timestamp % REFRESH_MS < FRAME_MS) {
        level = focusLevelFor(tracker.stats, level)
        levelAt.set(Math.floor(timestamp / 1000), level)
      }
    }

    expect(levelAt.get(9)).toBe('warmingUp')
    expect(levelAt.get(12)).not.toBe('pitchPerfect')
    expect(levelAt.get(16)).toBe('pitchPerfect')
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

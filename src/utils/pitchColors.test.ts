import { describe, expect, test } from 'vitest'
import {
  CLEAN_CENTS,
  CLOSE_CENTS,
  colorAtMidi,
  colorRgbAtMidi,
  directionalCleanColor,
  directionalCleanColorRgb,
  directionalTextColor,
  OFF_CENTS,
  textColorAtMidi,
  voiceTypeColor,
} from './pitchColors'

/* Asserts the rule in AGENTS.md "Pitch Accuracy Thresholds" rather than
 * pinning today's values, so a deliberate retune only fails if it breaks it */
describe('pitch accuracy tiers', () => {
  test('should run clean < close < off', () => {
    expect(CLEAN_CENTS).toBeLessThan(CLOSE_CENTS)
    expect(CLOSE_CENTS).toBeLessThan(OFF_CENTS)
  })

  test('should cap off at half a semitone, where the nearest note flips', () => {
    expect(OFF_CENTS).toBe(50)
  })
})

describe('colorRgbAtMidi', () => {
  test('returns an RGB tuple', () => {
    const [r, g, b] = colorRgbAtMidi(60)
    expect(r).toBeGreaterThanOrEqual(0)
    expect(r).toBeLessThanOrEqual(255)
    expect(g).toBeGreaterThanOrEqual(0)
    expect(g).toBeLessThanOrEqual(255)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(b).toBeLessThanOrEqual(255)
  })

  test('clamps values at MIDI boundaries', () => {
    const low = colorRgbAtMidi(0)
    const atMin = colorRgbAtMidi(36)
    expect(low).toEqual(atMin)

    const high = colorRgbAtMidi(200)
    const atMax = colorRgbAtMidi(96)
    expect(high).toEqual(atMax)
  })
})

describe('colorAtMidi', () => {
  test('returns rgba string with specified opacity', () => {
    const color = colorAtMidi(60, 0.7)
    expect(color).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/)
    expect(color).toContain('0.7')
  })
})

describe('textColorAtMidi', () => {
  test('returns rgb string', () => {
    const color = textColorAtMidi(60)
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  test('returns different colors for different MIDI ranges', () => {
    const low = textColorAtMidi(36)
    const high = textColorAtMidi(84)
    expect(low).not.toBe(high)
  })
})

const isGreen = ([r, g, b]: [number, number, number]) => g > r && g > b

const isBlue = ([r, g, b]: [number, number, number]) => b > r && b > g

const isWarm = ([r, g, b]: [number, number, number]) => r > b && r >= g

/* WCAG relative luminance: how bright a colour reads, 0 (black) to 1 (white) */
const luminance = (rgb: [number, number, number]) => {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255

    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}

/* Asserts the rule in AGENTS.md "Pitch Colours" rather than pinning today's
 * shades, so a deliberate retune only fails if it breaks the rule */
describe('pitch colour rule', () => {
  const textColorsFor = (cents: number) =>
    [false, true].map((isDark) => parseRgb(directionalTextColor(cents, isDark)))
  const allColorsFor = (cents: number) => [
    ...textColorsFor(cents),
    directionalCleanColorRgb(cents),
  ]

  test('should be green within CLEAN_CENTS, on both sides', () => {
    for (const cents of [-CLEAN_CENTS, -1, 0, 1, CLEAN_CENTS])
      for (const rgb of allColorsFor(cents)) expect(isGreen(rgb)).toBe(true)
  })

  test('should be blue when flat beyond CLEAN_CENTS', () => {
    for (const cents of [-CLOSE_CENTS, -OFF_CENTS])
      for (const rgb of allColorsFor(cents)) expect(isBlue(rgb)).toBe(true)
  })

  test('should be warm when sharp beyond CLEAN_CENTS', () => {
    for (const cents of [CLOSE_CENTS, OFF_CENTS])
      for (const rgb of allColorsFor(cents)) expect(isWarm(rgb)).toBe(true)
  })

  /* Thin lines are told apart by brightness more than hue: a flat blue as
   * bright as the green (the old sky blues were) reads as clean */
  test('should keep the clean green clearly brighter than any flat blue', () => {
    for (const [clean, flat] of [
      [allColorsFor(0), allColorsFor(-CLOSE_CENTS)],
      [allColorsFor(0), allColorsFor(-OFF_CENTS)],
    ])
      clean.forEach((cleanRgb, index) =>
        expect(luminance(cleanRgb)).toBeGreaterThanOrEqual(
          1.5 * luminance(flat[index]!),
        ),
      )
  })
})

describe('directionalTextColor', () => {
  const themes = [false, true]

  const contrastOnWhite = (color: string) =>
    1.05 / (luminance(parseRgb(color)) + 0.05)

  test('returns an rgb string', () => {
    expect(directionalTextColor(0)).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  })

  test('should use a different shade per theme', () => {
    for (const cents of [0, -OFF_CENTS, OFF_CENTS])
      expect(directionalTextColor(cents, true)).not.toBe(
        directionalTextColor(cents, false),
      )
  })

  /* Halfway into the close band the colour has already left green: blue when
   * flat, turning yellow when sharp (more red than the clean green) */
  test('should lean blue when flat and yellow when sharp past CLEAN_CENTS', () => {
    const midway = (CLEAN_CENTS + CLOSE_CENTS) / 2

    for (const isDark of themes) {
      const [cleanR] = parseRgb(directionalTextColor(0, isDark))
      const [sharpR, , sharpB] = parseRgb(directionalTextColor(midway, isDark))

      expect(isBlue(parseRgb(directionalTextColor(-midway, isDark)))).toBe(true)
      expect(sharpR).toBeGreaterThan(cleanR)
      expect(sharpR).toBeGreaterThan(sharpB)
    }
  })

  test('should be yellow when close and sharp, red when off', () => {
    for (const isDark of themes) {
      const [r, g, b] = parseRgb(directionalTextColor(CLOSE_CENTS, isDark))
      expect(r).toBeGreaterThan(b)
      expect(g).toBeGreaterThan(b)

      const [offR, offG, offB] = parseRgb(
        directionalTextColor(OFF_CENTS, isDark),
      )
      expect(offR).toBeGreaterThan(offG)
      expect(offR).toBeGreaterThan(offB)
    }
  })

  /* The flat side is never harder to read than the sharp side it mirrors */
  test('flat reads at least as well as sharp on white', () => {
    for (const cents of [CLOSE_CENTS, 35, OFF_CENTS])
      expect(
        contrastOnWhite(directionalTextColor(-cents, false)),
      ).toBeGreaterThanOrEqual(
        contrastOnWhite(directionalTextColor(cents, false)),
      )
  })
})

describe('directionalCleanColor', () => {
  test('should give the rgba string the requested opacity', () => {
    expect(directionalCleanColor(0, 0.5)).toMatch(
      /^rgba\(\d+, \d+, \d+, 0\.5\)$/,
    )
  })
})

describe('voiceTypeColor', () => {
  const linear = (rgb: [number, number, number]) =>
    rgb.map((channel) => {
      const c = channel / 255

      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })

  const relativeLuminance = (rgb: [number, number, number]) => {
    const [r, g, b] = linear(rgb)

    return 0.2126 * r + 0.7152 * g + 0.0722 * b
  }

  /* OKLab: a colour space where straight-line distance tracks perceived difference */
  const oklab = (rgb: [number, number, number]) => {
    const [r, g, b] = linear(rgb)
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    const s = Math.cbrt(0.0883024619 * r + 0.2817184344 * g + 0.6299787005 * b)

    return [
      0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ]
  }

  const distance = (a: string, b: string) => {
    const [x, y] = [oklab(parseRgb(a)), oklab(parseRgb(b))]

    return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
  }

  /* An ordered scale reads as an open arc: a palette that wraps round the
   * colour wheel (red … pink) made Bass and Soprano, the furthest voices,
   * look like neighbours */
  test('Bass and Soprano differ more than any two neighbouring voices', () => {
    for (const isDark of [false, true]) {
      const colors = Array.from({ length: 6 }, (_, index) =>
        voiceTypeColor(index, isDark),
      )
      const ends = distance(colors[0]!, colors[5]!)

      for (let index = 0; index < 5; index++)
        expect(ends).toBeGreaterThan(
          distance(colors[index]!, colors[index + 1]!),
        )
    }
  })

  /* Light colours double as 12px text on white (exploring's lit name) */
  test('every light colour reads as text on white (WCAG AA 4.5:1)', () => {
    for (let index = 0; index < 6; index++) {
      const luminance = relativeLuminance(
        parseRgb(voiceTypeColor(index, false)),
      )
      expect((1 + 0.05) / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5)
    }
  })

  test('gives each of the six voices its own colour in both themes', () => {
    for (const isDark of [false, true]) {
      const colors = Array.from({ length: 6 }, (_, index) =>
        voiceTypeColor(index, isDark),
      )
      expect(new Set(colors).size).toBe(6)
    }
  })

  test('clamps an out-of-range index to Bass or Soprano', () => {
    expect(voiceTypeColor(-1, false)).toBe(voiceTypeColor(0, false))
    expect(voiceTypeColor(9, true)).toBe(voiceTypeColor(5, true))
  })

  test('applies opacity', () => {
    expect(voiceTypeColor(0, false, 0.25)).toMatch(/, 0\.25\)$/)
  })
})

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/)
  if (!match) throw new Error(`Cannot parse color: ${color}`)

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

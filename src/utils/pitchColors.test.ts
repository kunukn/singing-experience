import { describe, expect, test } from 'vitest'
import {
  CLEAN_CENTS,
  CLOSE_CENTS,
  cleanColor,
  cleanColorRgb,
  cleanTextColor,
  colorAtMidi,
  colorRgbAtMidi,
  directionalCleanColorRgb,
  directionalTextColor,
  neutralDirectionalTextColor,
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

describe('cleanTextColor', () => {
  test('returns green-ish color at 0 cents in dark mode (default)', () => {
    const color = cleanTextColor(0)
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    const [r, g, b] = parseRgb(color)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })

  test('returns neon green at 0 cents in dark mode', () => {
    const [r, g, b] = parseRgb(cleanTextColor(0, true))
    expect(r).toBe(57)
    expect(g).toBe(255)
    expect(b).toBe(130)
  })

  test('returns emerald green at 0 cents in light mode', () => {
    const [r, g, b] = parseRgb(cleanTextColor(0, false))
    expect(r).toBe(16)
    expect(g).toBe(185)
    expect(b).toBe(129)
  })

  test('light mode green is darker than dark mode green', () => {
    const [, gDark] = parseRgb(cleanTextColor(0, true))
    const [, gLight] = parseRgb(cleanTextColor(0, false))
    expect(gDark).toBeGreaterThan(gLight)
  })

  test('returns red-ish color at 50 cents (far off pitch)', () => {
    const color = cleanTextColor(50)
    const [r, g, b] = parseRgb(color)
    expect(r).toBeGreaterThan(g)
    expect(r).toBeGreaterThan(b)
  })

  test('returns yellow-ish color in the close tier (~18 cents)', () => {
    const [r, g, b] = parseRgb(cleanTextColor(18))
    // Yellow has high red AND high green, low blue
    expect(r).toBeGreaterThan(b)
    expect(g).toBeGreaterThan(b)
  })

  test('handles negative cents symmetrically', () => {
    const positive = cleanTextColor(30)
    const negative = cleanTextColor(-30)
    expect(positive).toBe(negative)
  })
})

describe('cleanColor', () => {
  test('returns rgba string', () => {
    const color = cleanColor(0, 0.5)
    expect(color).toMatch(/^rgba\(\d+, \d+, \d+, [\d.]+\)$/)
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

describe('directionalTextColor', () => {
  const themes = [false, true]

  const contrastOnWhite = (color: string) => {
    const [r, g, b] = parseRgb(color).map((channel) => {
      const c = channel / 255

      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })

    return 1.05 / (0.2126 * r! + 0.7152 * g! + 0.0722 * b! + 0.05)
  }

  test('sharp keeps the existing ramp', () => {
    for (const isDark of themes)
      for (const cents of [0, 5, CLEAN_CENTS, 15, CLOSE_CENTS, 35, OFF_CENTS])
        expect(directionalTextColor(cents, isDark)).toBe(
          cleanTextColor(cents, isDark),
        )
  })

  test('flat and sharp share the green within CLEAN_CENTS', () => {
    for (const isDark of themes)
      expect(directionalTextColor(-CLEAN_CENTS, isDark)).toBe(
        directionalTextColor(CLEAN_CENTS, isDark),
      )
  })

  test('flat beyond CLEAN_CENTS turns blue', () => {
    for (const isDark of themes)
      for (const cents of [-CLOSE_CENTS, -OFF_CENTS]) {
        const [r, g, b] = parseRgb(directionalTextColor(cents, isDark))
        expect(b).toBeGreaterThan(r)
        expect(b).toBeGreaterThan(g)
      }
  })

  /* The flat side is never harder to read than the sharp side it mirrors */
  test('flat reads at least as well as sharp on white', () => {
    for (const cents of [CLOSE_CENTS, 35, OFF_CENTS])
      expect(
        contrastOnWhite(directionalTextColor(-cents, false)),
      ).toBeGreaterThanOrEqual(contrastOnWhite(cleanTextColor(cents, false)))
  })
})

describe('neutralDirectionalTextColor', () => {
  const themes = [false, true]

  test('should be one grey on both sides within CLEAN_CENTS', () => {
    for (const isDark of themes) {
      const grey = neutralDirectionalTextColor(0, isDark)
      const [r, g, b] = parseRgb(grey)

      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan(40)
      for (const cents of [-CLEAN_CENTS, -1, 1, CLEAN_CENTS])
        expect(neutralDirectionalTextColor(cents, isDark)).toBe(grey)
    }
  })

  test('should not use the green of directionalTextColor', () => {
    for (const isDark of themes)
      expect(neutralDirectionalTextColor(1, isDark)).not.toBe(
        directionalTextColor(1, isDark),
      )
  })

  test('should end on the same blue and red as directionalTextColor', () => {
    for (const isDark of themes)
      for (const cents of [-OFF_CENTS, -CLOSE_CENTS, CLOSE_CENTS, OFF_CENTS])
        expect(neutralDirectionalTextColor(cents, isDark)).toBe(
          directionalTextColor(cents, isDark),
        )
  })

  test('should lean blue when flat and warm when sharp past CLEAN_CENTS', () => {
    const midway = (CLEAN_CENTS + CLOSE_CENTS) / 2

    for (const isDark of themes) {
      const [flatR, , flatB] = parseRgb(
        neutralDirectionalTextColor(-midway, isDark),
      )
      const [sharpR, , sharpB] = parseRgb(
        neutralDirectionalTextColor(midway, isDark),
      )

      expect(flatB).toBeGreaterThan(flatR)
      expect(sharpR).toBeGreaterThan(sharpB)
    }
  })
})

describe('directionalCleanColorRgb', () => {
  test('sharp keeps the existing trail ramp', () => {
    for (const cents of [0, 5, CLEAN_CENTS, 15, CLOSE_CENTS, 35, OFF_CENTS])
      expect(directionalCleanColorRgb(cents)).toEqual(cleanColorRgb(cents))
  })

  test('flat and sharp share the green within CLEAN_CENTS', () => {
    expect(directionalCleanColorRgb(-CLEAN_CENTS)).toEqual(
      directionalCleanColorRgb(CLEAN_CENTS),
    )
  })

  test('flat beyond CLEAN_CENTS turns blue', () => {
    for (const cents of [-CLOSE_CENTS, -OFF_CENTS]) {
      const [r, g, b] = directionalCleanColorRgb(cents)
      expect(b).toBeGreaterThan(r)
      expect(b).toBeGreaterThan(g)
    }
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

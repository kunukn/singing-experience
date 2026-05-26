import { describe, expect, test } from 'vitest'
import {
  cleanColor,
  cleanTextColor,
  colorAtMidi,
  colorRgbAtMidi,
  textColorAtMidi,
} from './pitchColors'

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

function parseRgb(color: string): [number, number, number] {
  const match = color.match(/(\d+),\s*(\d+),\s*(\d+)/)
  if (!match) throw new Error(`Cannot parse color: ${color}`)

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

import { describe, expect, test } from 'vitest'
import {
  cleanColor,
  cleanTextColor,
  colorAtMidi,
  colorRgbAtMidi,
  textColorAtMidi,
} from './pitchColors'

describe('cleanTextColor', () => {
  test('returns green-ish color at 0 cents (perfect pitch)', () => {
    const color = cleanTextColor(0)
    expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
    // At 0 cents, should be the "clean" green variant
    const [r, g, b] = parseRgb(color)
    expect(g).toBeGreaterThan(r)
    expect(g).toBeGreaterThan(b)
  })

  test('returns orange-ish color at 50 cents (far off pitch)', () => {
    const color = cleanTextColor(50)
    const [r, g] = parseRgb(color)
    expect(r).toBeGreaterThan(g)
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

import { describe, expect, test } from 'vitest'
import {
  clampPitchY,
  pitchLineColors,
  resolveEffectiveMidi,
} from './pitchLineRenderer'

describe('resolveEffectiveMidi', () => {
  test('returns fractional MIDI from a valid frequency (A4 = 440 Hz → 69)', () => {
    expect(resolveEffectiveMidi(50, 440)).toBeCloseTo(69, 10)
  })

  test('falls back to the integer MIDI when frequency is null', () => {
    expect(resolveEffectiveMidi(57, null)).toBe(57)
  })

  test('falls back when frequency is missing or non-positive', () => {
    expect(resolveEffectiveMidi(57)).toBe(57)
    expect(resolveEffectiveMidi(57, 0)).toBe(57)
    expect(resolveEffectiveMidi(57, -10)).toBe(57)
  })
})

describe('clampPitchY', () => {
  const HEIGHT = 100 // padded band is [16, 84]; overflow ±6 → clamp [10, 90]

  test('in-range Y passes through unchanged', () => {
    const result = clampPitchY(50, HEIGHT)
    expect(result.isOutOfRange).toBe(false)
    expect(result.clampedY).toBe(50)
  })

  test('above the top padding is out of range and clamped to the overflow edge', () => {
    const result = clampPitchY(-100, HEIGHT)
    expect(result.isOutOfRange).toBe(true)
    expect(result.clampedY).toBe(10)
  })

  test('below the bottom padding is out of range and clamped to the overflow edge', () => {
    const result = clampPitchY(500, HEIGHT)
    expect(result.isOutOfRange).toBe(true)
    expect(result.clampedY).toBe(90)
  })

  test('honors custom paddings', () => {
    const result = clampPitchY(5, HEIGHT, 0, 0)
    expect(result.isOutOfRange).toBe(false)
    expect(result.clampedY).toBe(5)
  })
})

describe('pitchLineColors', () => {
  test('correct (on target) wins over out-of-range → green', () => {
    const colors = pitchLineColors({ isOutOfRange: true, isCorrect: true })
    expect(colors).toEqual({
      line: 'rgba(74, 222, 128, 0.3)',
      dot: 'rgba(74, 222, 128, 0.8)',
      label: 'rgba(74, 222, 128, 0.9)',
    })
  })

  test('out-of-range (not correct) → red', () => {
    const colors = pitchLineColors({ isOutOfRange: true })
    expect(colors).toEqual({
      line: 'rgba(239, 68, 68, 0.25)',
      dot: 'rgba(239, 68, 68, 0.7)',
      label: 'rgba(239, 68, 68, 0.8)',
    })
  })

  test('in range and not correct → orange', () => {
    const colors = pitchLineColors({ isOutOfRange: false })
    expect(colors).toEqual({
      line: 'rgba(251, 146, 60, 0.25)',
      dot: 'rgba(251, 146, 60, 0.7)',
      label: 'rgba(251, 146, 60, 0.8)',
    })
  })
})

import { describe, expect, test } from 'vitest'
import { midiToFrequency } from './noteUtils'
import { centsBetween, isOnPitch } from './pitchMatch'

const A4 = 440
const A5 = 880

describe('pitchMatch', () => {
  test('centsBetween is signed: positive when sung above the target', () => {
    expect(centsBetween(A4 * 2 ** (30 / 1200), A4)).toBeCloseTo(30, 5)
    expect(centsBetween(A4 * 2 ** (-30 / 1200), A4)).toBeCloseTo(-30, 5)
  })

  test('isOnPitch defaults to the ±25¢ close threshold', () => {
    expect(isOnPitch(A4 * 2 ** (24 / 1200), A4)).toBe(true)
    expect(isOnPitch(A4 * 2 ** (26 / 1200), A4)).toBe(false)
  })

  test.each([
    { cents: 49, expected: true },
    { cents: 50, expected: true },
    { cents: 51, expected: false },
    { cents: -50, expected: true },
    { cents: -51, expected: false },
  ])(
    'isOnPitch at $cents¢ with a 50¢ tolerance is $expected',
    ({ cents, expected }) => {
      expect(isOnPitch(A4 * 2 ** (cents / 1200), A4, 50)).toBe(expected)
    },
  )

  test('an octave away never counts as on pitch', () => {
    expect(isOnPitch(A5, A4, 50)).toBe(false)
    expect(isOnPitch(midiToFrequency(48), midiToFrequency(60), 50)).toBe(false)
  })
})

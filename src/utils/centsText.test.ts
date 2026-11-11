import { describe, expect, test } from 'vitest'
import { isNearZeroCents } from './centsText'

describe('centsText', () => {
  test.each([
    { cents: -3, expected: false },
    { cents: -2, expected: true },
    { cents: -1, expected: true },
    { cents: 0, expected: true },
    { cents: 1, expected: true },
    { cents: 2, expected: true },
    { cents: 2.4, expected: true },
    { cents: 2.6, expected: false },
    { cents: 3, expected: false },
  ])('reads $cents cents as near zero: $expected', ({ cents, expected }) => {
    expect(isNearZeroCents(cents)).toBe(expected)
  })
})

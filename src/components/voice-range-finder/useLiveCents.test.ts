import { describe, expect, test } from 'vitest'
import { effectScope, ref } from 'vue'
import { centsLabel, formatSignedCents, useLiveCents } from './useLiveCents'

describe('formatSignedCents', () => {
  test.each([
    { cents: 12, expected: '+12¢' },
    { cents: -7, expected: '-7¢' },
    { cents: 0, expected: '0¢' },
  ])('formats $cents as "$expected"', ({ cents, expected }) => {
    expect(formatSignedCents(cents)).toBe(expected)
  })
})

describe('centsLabel', () => {
  test.each([
    { cents: -3, expected: '-3¢' },
    { cents: -2, expected: '' },
    { cents: 0, expected: '' },
    { cents: 2, expected: '' },
    { cents: 3, expected: '+3¢' },
  ])('labels $cents as "$expected"', ({ cents, expected }) => {
    expect(centsLabel(cents)).toBe(expected)
  })
})

describe('useLiveCents', () => {
  test('should follow the live note and go blank on silence', () => {
    const midi = ref<number | null>(57.12)
    const scope = effectScope()
    const { liveCents, liveCentsText, liveCentsColor } = scope.run(() =>
      useLiveCents(midi),
    )!

    expect(liveCents.value).toBe(12)
    expect(liveCentsText.value).toBe('+12¢')
    expect(liveCentsColor.value).toBeDefined()

    midi.value = null

    expect(liveCents.value).toBe(null)
    expect(liveCentsText.value).toBe('')
    expect(liveCentsColor.value).toBeUndefined()
    scope.stop()
  })

  test('should give negative cents for a flat note', () => {
    const scope = effectScope()
    const { liveCentsText } = scope.run(() => useLiveCents(() => 56.93))!

    expect(liveCentsText.value).toBe('-7¢')
    scope.stop()
  })

  test('should hide the text within 2¢ but keep the exact cents', () => {
    const midi = ref(57.02)
    const scope = effectScope()
    const { liveCents, liveCentsText } = scope.run(() => useLiveCents(midi))!

    expect(liveCents.value).toBe(2)
    expect(liveCentsText.value).toBe('')

    midi.value = 56.98
    expect(liveCentsText.value).toBe('')

    midi.value = 57.03
    expect(liveCentsText.value).toBe('+3¢')
    scope.stop()
  })
})

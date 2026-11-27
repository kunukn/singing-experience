import { describe, expect, test } from 'vitest'
import { effectScope, ref } from 'vue'
import { CENTS_DEAD_ZONE, NEAR_ZERO_CENTS_TEXT } from '@/utils/centsText'
import { centsLabel, formatSignedCents, useLiveCents } from './useLiveCents'

/* The first whole cent the label still spells out */
const JUST_OUTSIDE = CENTS_DEAD_ZONE + 1
const A3_MIDI = 57

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
    { cents: -JUST_OUTSIDE, expected: `-${JUST_OUTSIDE}¢` },
    { cents: -CENTS_DEAD_ZONE, expected: NEAR_ZERO_CENTS_TEXT },
    { cents: 0, expected: NEAR_ZERO_CENTS_TEXT },
    { cents: CENTS_DEAD_ZONE, expected: NEAR_ZERO_CENTS_TEXT },
    { cents: JUST_OUTSIDE, expected: `+${JUST_OUTSIDE}¢` },
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

  test('should read as about zero inside the dead zone but keep the exact cents', () => {
    /* 100 cents to a semitone */
    const midi = ref(A3_MIDI + CENTS_DEAD_ZONE / 100)
    const scope = effectScope()
    const { liveCents, liveCentsText } = scope.run(() => useLiveCents(midi))!

    expect(liveCents.value).toBe(CENTS_DEAD_ZONE)
    expect(liveCentsText.value).toBe(NEAR_ZERO_CENTS_TEXT)

    midi.value = A3_MIDI - CENTS_DEAD_ZONE / 100
    expect(liveCentsText.value).toBe(NEAR_ZERO_CENTS_TEXT)

    midi.value = A3_MIDI + JUST_OUTSIDE / 100
    expect(liveCentsText.value).toBe(`+${JUST_OUTSIDE}¢`)
    scope.stop()
  })
})

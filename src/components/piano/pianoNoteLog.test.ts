import { describe, expect, test } from 'vitest'
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { appendNoteLogToken, formatNoteLogToken } from './pianoNoteLog'

const D4 = 62
const C_SHARP_4 = 61

describe('pianoNoteLog - formatNoteLogToken', () => {
  test.each<{
    midi: number
    mode: ToneLabelMode
    style: AccidentalStyle
    expected: string
  }>([
    { midi: D4, mode: 'advanced', style: 'sharp', expected: 'D4' },
    { midi: D4, mode: 'simple', style: 'sharp', expected: 'D' },
    { midi: D4, mode: 'off', style: 'sharp', expected: 'D' },
    { midi: D4, mode: 'advanced', style: 'flat', expected: 'D4' },
    { midi: C_SHARP_4, mode: 'advanced', style: 'sharp', expected: 'C#4' },
    { midi: C_SHARP_4, mode: 'advanced', style: 'flat', expected: 'Db4' },
    { midi: C_SHARP_4, mode: 'simple', style: 'sharp', expected: 'C#' },
    { midi: C_SHARP_4, mode: 'off', style: 'flat', expected: 'Db' },
  ])(
    'returns "$expected" for midi $midi in $mode mode with $style accidentals',
    ({ midi, mode, style, expected }) => {
      expect(formatNoteLogToken(midi, mode, style)).toBe(expected)
    },
  )
})

describe('pianoNoteLog - appendNoteLogToken', () => {
  test('starts an empty log without a leading space', () => {
    expect(appendNoteLogToken('', 'D4')).toBe('D4')
  })

  test('separates notes with one space', () => {
    expect(appendNoteLogToken('D4', 'E4')).toBe('D4 E4')
  })

  test.each([
    { text: 'D4 ', expected: 'D4 E4' },
    { text: 'D4\n', expected: 'D4\nE4' },
  ])('adds no extra space after typed whitespace', ({ text, expected }) => {
    expect(appendNoteLogToken(text, 'E4')).toBe(expected)
  })

  test('keeps earlier notes as logged when the label mode changes', () => {
    const afterFirst = appendNoteLogToken(
      '',
      formatNoteLogToken(D4, 'advanced', 'sharp'),
    )
    const afterSecond = appendNoteLogToken(
      afterFirst,
      formatNoteLogToken(D4 + 2, 'simple', 'sharp'),
    )

    expect(afterSecond).toBe('D4 E')
  })
})

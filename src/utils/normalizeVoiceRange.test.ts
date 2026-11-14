import { describe, expect, test } from 'vitest'
import {
  DEFAULT_MY_VOICE_RANGE,
  normalizeVoiceRange,
} from './normalizeVoiceRange'

describe('normalizeVoiceRange', () => {
  test('keeps a valid range unchanged', () => {
    expect(normalizeVoiceRange(43, 71)).toEqual({ midiMin: 43, midiMax: 71 })
  })

  test('swaps an inverted range', () => {
    expect(normalizeVoiceRange(71, 43)).toEqual({ midiMin: 43, midiMax: 71 })
  })

  test('rounds to whole semitones', () => {
    expect(normalizeVoiceRange(42.6, 70.6)).toEqual({
      midiMin: 43,
      midiMax: 71,
    })
  })

  test('clamps to C2–C7', () => {
    expect(normalizeVoiceRange(20, 120)).toEqual({ midiMin: 36, midiMax: 96 })
  })

  test('widens a range under an octave upward', () => {
    expect(normalizeVoiceRange(55, 62)).toEqual({ midiMin: 55, midiMax: 67 })
  })

  test('widens downward when the top is already at C7', () => {
    expect(normalizeVoiceRange(92, 96)).toEqual({ midiMin: 84, midiMax: 96 })
  })

  test.each([
    { midiMin: Number.NaN, midiMax: 60 },
    { midiMin: 48, midiMax: Number.POSITIVE_INFINITY },
  ])(
    'falls back to the default for $midiMin–$midiMax',
    ({ midiMin, midiMax }) => {
      expect(normalizeVoiceRange(midiMin, midiMax)).toEqual(
        DEFAULT_MY_VOICE_RANGE,
      )
    },
  )
})

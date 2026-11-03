import { describe, expect, test } from 'vitest'
import {
  VOICE_RANGE_HIGHEST_MIDI,
  VOICE_RANGE_LOWEST_MIDI,
} from '@/utils/normalizeVoiceRange'
import {
  formatRange,
  VOICE_RANGE_NOTE_OPTIONS,
  withHighest,
  withLowest,
} from './voiceRangeNotes'

const G2 = 43
const E4 = 64

describe('voiceRangeNotes', () => {
  test('should list notes high to low, C6 down to C2', () => {
    expect(VOICE_RANGE_NOTE_OPTIONS[0]?.value).toBe(VOICE_RANGE_HIGHEST_MIDI)
    expect(VOICE_RANGE_NOTE_OPTIONS.at(-1)?.value).toBe(VOICE_RANGE_LOWEST_MIDI)
  })

  test('should format a range', () => {
    expect(formatRange(G2, E4)).toBe('G2–E4')
  })

  test('should keep the other end when the span stays an octave', () => {
    expect(withLowest({ midiMin: 48, midiMax: E4 }, G2)).toEqual({
      midiMin: G2,
      midiMax: E4,
    })
    expect(withHighest({ midiMin: G2, midiMax: 60 }, E4)).toEqual({
      midiMin: G2,
      midiMax: E4,
    })
  })

  test('should push the other end away to keep an octave', () => {
    expect(withLowest({ midiMin: G2, midiMax: E4 }, 60)).toEqual({
      midiMin: 60,
      midiMax: 72,
    })
    expect(withHighest({ midiMin: G2, midiMax: E4 }, 50)).toEqual({
      midiMin: 38,
      midiMax: 50,
    })
  })
})

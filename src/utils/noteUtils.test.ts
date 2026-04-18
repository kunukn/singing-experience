import { describe, expect, test } from 'vitest'
import {
  frequencyToNote,
  frequencyToNoteName,
  midiToFrequency,
  noteToFrequency,
} from './noteUtils'

describe('frequencyToNote', () => {
  test('returns A4 at 440 Hz with 0 cents', () => {
    const result = frequencyToNote(440)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('A')
    expect(result!.octave).toBe(4)
    expect(result!.cents).toBe(0)
    expect(result!.midiNote).toBe(69)
  })

  test('returns C4 (middle C) at ~261.63 Hz', () => {
    const result = frequencyToNote(261.63)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('C')
    expect(result!.octave).toBe(4)
    expect(Math.abs(result!.cents)).toBeLessThanOrEqual(1)
  })

  test('detects B3 with positive cents for slightly sharp frequency', () => {
    const b3Perfect = noteToFrequency('B', 3)
    const b3Sharp20 = b3Perfect * Math.pow(2, 20 / 1200)
    const result = frequencyToNote(b3Sharp20)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('B')
    expect(result!.octave).toBe(3)
    expect(result!.cents).toBe(20)
  })

  test('detects negative cents for flat frequency', () => {
    const a4Flat = 440 * Math.pow(2, -30 / 1200)
    const result = frequencyToNote(a4Flat)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('A')
    expect(result!.octave).toBe(4)
    expect(result!.cents).toBe(-30)
  })

  test('returns null for zero frequency', () => {
    expect(frequencyToNote(0)).toBeNull()
  })

  test('returns null for negative frequency', () => {
    expect(frequencyToNote(-100)).toBeNull()
  })

  test('returns null for Infinity', () => {
    expect(frequencyToNote(Infinity)).toBeNull()
  })

  test('handles very low frequency (C2)', () => {
    const result = frequencyToNote(65.41)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('C')
    expect(result!.octave).toBe(2)
  })

  test('handles very high frequency (C6)', () => {
    const result = frequencyToNote(1046.5)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('C')
    expect(result!.octave).toBe(6)
  })
})

describe('noteToFrequency', () => {
  test('returns 440 for A4', () => {
    expect(noteToFrequency('A', 4)).toBeCloseTo(440, 1)
  })

  test('returns ~261.63 for C4', () => {
    expect(noteToFrequency('C', 4)).toBeCloseTo(261.63, 1)
  })

  test('round-trips correctly with frequencyToNote', () => {
    const hz = noteToFrequency('F#', 3)
    const result = frequencyToNote(hz)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('F#')
    expect(result!.octave).toBe(3)
    expect(result!.cents).toBe(0)
  })
})

describe('midiToFrequency', () => {
  test('returns 440 for MIDI 69 (A4)', () => {
    expect(midiToFrequency(69)).toBeCloseTo(440, 1)
  })

  test('returns ~261.63 for MIDI 60 (C4)', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.63, 1)
  })

  test('returns ~130.81 for MIDI 48 (C3)', () => {
    expect(midiToFrequency(48)).toBeCloseTo(130.81, 1)
  })
})

describe('frequencyToNote — hysteresis', () => {
  test('stays on B3 at exactly +50 cents when previousMidi is B3 (59)', () => {
    const b3 = noteToFrequency('B', 3)
    const hz = b3 * Math.pow(2, 50 / 1200)
    const result = frequencyToNote(hz, 59)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('B')
    expect(result!.octave).toBe(3)
    expect(result!.midiNote).toBe(59)
  })

  test('switches to C4 at +51 cents when previousMidi is B3 (59)', () => {
    const b3 = noteToFrequency('B', 3)
    const hz = b3 * Math.pow(2, 51 / 1200)
    const result = frequencyToNote(hz, 59)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('C')
    expect(result!.octave).toBe(4)
    expect(result!.midiNote).toBe(60)
  })

  test('stays on B3 at -50 cents when previousMidi is B3 (59)', () => {
    const b3 = noteToFrequency('B', 3)
    const hz = b3 * Math.pow(2, -50 / 1200)
    const result = frequencyToNote(hz, 59)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('B')
    expect(result!.octave).toBe(3)
    expect(result!.midiNote).toBe(59)
  })

  test('switches to A#3 at -51 cents when previousMidi is B3 (59)', () => {
    const b3 = noteToFrequency('B', 3)
    const hz = b3 * Math.pow(2, -51 / 1200)
    const result = frequencyToNote(hz, 59)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('A#')
    expect(result!.octave).toBe(3)
    expect(result!.midiNote).toBe(58)
  })

  test('behaves like Math.round without previousMidi at +50 cents', () => {
    const b3 = noteToFrequency('B', 3)
    const hz = b3 * Math.pow(2, 50 / 1200)
    const result = frequencyToNote(hz)
    expect(result).not.toBeNull()
    /* Without hysteresis the midpoint rounds up → C4 */
    expect(result!.midiNote).toBe(60)
  })
})

describe('frequencyToNoteName', () => {
  test('returns "A4" for 440 Hz', () => {
    expect(frequencyToNoteName(440)).toBe('A4')
  })

  test('returns "C4" for ~261.63 Hz', () => {
    expect(frequencyToNoteName(261.63)).toBe('C4')
  })

  test('returns null for invalid frequency', () => {
    expect(frequencyToNoteName(0)).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import {
  availableOctaveShifts,
  keyboardCodeForMidi,
  midiForKeyboardCode,
  qwertyCharForCode,
  reachableSpan,
  PIANO_KEYBOARD_BASE_MIDI,
} from './pianoKeyboardMap'

const C3 = 48
const C4 = 60 // middle C
const C5 = 72

describe('midiForKeyboardCode', () => {
  it('anchors the lower row at C3 and the upper row at C4', () => {
    expect(PIANO_KEYBOARD_BASE_MIDI).toBe(C3)
    expect(midiForKeyboardCode('KeyZ')).toBe(C3)
    expect(midiForKeyboardCode('KeyQ')).toBe(C4)
    expect(midiForKeyboardCode('KeyI')).toBe(C5)
  })

  it('maps the lower letter row to the C3 major scale', () => {
    const scale = ['KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM']

    expect(scale.map(midiForKeyboardCode)).toEqual([48, 50, 52, 53, 55, 57, 59])
  })

  it('maps the upper letter row to the C4 major scale', () => {
    const scale = ['KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU']

    expect(scale.map(midiForKeyboardCode)).toEqual([60, 62, 64, 65, 67, 69, 71])
  })

  it('puts the sharps on the row above their naturals', () => {
    /* C♯3 D♯3 — F♯3 G♯3 A♯3, mirrored by 2 3 — 5 6 7 an octave up */
    expect(
      ['KeyS', 'KeyD', 'KeyG', 'KeyH', 'KeyJ'].map(midiForKeyboardCode),
    ).toEqual([49, 51, 54, 56, 58])
    expect(
      ['Digit2', 'Digit3', 'Digit5', 'Digit6', 'Digit7'].map(
        midiForKeyboardCode,
      ),
    ).toEqual([61, 63, 66, 68, 70])
  })

  it('lets the lower row overflow into the C4 octave', () => {
    expect(midiForKeyboardCode('Comma')).toBe(C4)
    expect(midiForKeyboardCode('Slash')).toBe(64) // E4
  })

  it('returns null for unmapped keys', () => {
    expect(midiForKeyboardCode('KeyA')).toBeNull()
    expect(midiForKeyboardCode('Space')).toBeNull()
    expect(midiForKeyboardCode('Digit1')).toBeNull()
  })
})

describe('keyboardCodeForMidi', () => {
  it('prefers the upper row where both rows play the same pitch', () => {
    /* Comma and KeyQ both play C4; the key face advertises the row that starts
     * a complete octave. */
    expect(keyboardCodeForMidi(C4)).toBe('KeyQ')
  })

  it('returns null outside the two-octave span', () => {
    expect(keyboardCodeForMidi(C3 - 1)).toBeNull()
    expect(keyboardCodeForMidi(77)).toBeNull() // F5, one past KeyP
  })

  it('round-trips every mapped pitch', () => {
    for (let midi = C3; midi <= 76; midi++) {
      const code = keyboardCodeForMidi(midi)

      expect(code).not.toBeNull()
      expect(midiForKeyboardCode(code as string)).toBe(midi)
    }
  })
})

describe('voice-range coverage', () => {
  const playableCount = (midiMin: number, midiMax: number) => {
    let count = 0
    for (let midi = midiMin; midi <= midiMax; midi++) {
      if (keyboardCodeForMidi(midi)) count++
    }

    return count
  }

  /* The C3 anchor is chosen so no preset collapses to a handful of keys — a C4
   * anchor would leave "Comfy men" (C3–C4) with a single playable note. */
  it.each(VOICE_RANGES)(
    'leaves $noteRange with a playable span',
    ({ midiMin, midiMax }) => {
      expect(playableCount(midiMin, midiMax)).toBeGreaterThanOrEqual(11)
    },
  )

  it('covers the narrow low presets completely', () => {
    /* Comfy men C3–C4 and Everyone G3–G4 — every note reachable */
    expect(playableCount(48, 60)).toBe(13)
    expect(playableCount(55, 67)).toBe(13)
  })
})

describe('availableOctaveShifts', () => {
  it('always offers the printed layout', () => {
    for (const { midiMin, midiMax } of VOICE_RANGES) {
      expect(availableOctaveShifts(midiMin, midiMax)).toContain(0)
    }
  })

  it('keeps narrow presets on a single position', () => {
    /* Everyone G3–G4, Kids D4–D5, Comfy men C3–C4 all fit inside the unshifted
     * span, so a transpose would move the fingering for no extra reach. */
    expect(availableOctaveShifts(55, 67)).toEqual([0])
    expect(availableOctaveShifts(62, 74)).toEqual([0])
    expect(availableOctaveShifts(48, 60)).toEqual([0])
  })

  it('adds positions only where they reach new pitches', () => {
    expect(availableOctaveShifts(36, 96)).toEqual([-1, 0, 1, 2]) // Full C2–C7
    expect(availableOctaveShifts(60, 84)).toEqual([0, 1]) // Soprano C4–C6
    expect(availableOctaveShifts(40, 64)).toEqual([-1, 0]) // Bass E2–E4
  })

  it('anchors the readout on a C at every position', () => {
    /* The on-screen control reads "Z = <note>", where the note is the base
     * moved by whole octaves — so Full C2–C7 steps C2, C3, C4, C5. */
    const anchors = availableOctaveShifts(36, 96).map(
      (shift) => PIANO_KEYBOARD_BASE_MIDI + shift * 12,
    )

    expect(anchors).toEqual([36, 48, 60, 72])
  })

  it('makes every note of every preset playable across its shifts', () => {
    for (const { noteRange, midiMin, midiMax } of VOICE_RANGES) {
      const reachable = new Set<number>()
      for (const shift of availableOctaveShifts(midiMin, midiMax)) {
        const span = reachableSpan(shift, midiMin, midiMax)
        for (let midi = span.low; midi <= span.high; midi++) {
          if (keyboardCodeForMidi(midi - shift * 12)) reachable.add(midi)
        }
      }

      expect({ noteRange, count: reachable.size }).toEqual({
        noteRange,
        count: midiMax - midiMin + 1,
      })
    }
  })
})

describe('qwertyCharForCode', () => {
  it('unwraps letter and digit codes', () => {
    expect(qwertyCharForCode('KeyZ')).toBe('Z')
    expect(qwertyCharForCode('Digit2')).toBe('2')
  })

  it('maps punctuation codes to their glyph', () => {
    expect(qwertyCharForCode('Comma')).toBe(',')
    expect(qwertyCharForCode('Slash')).toBe('/')
  })
})

import { describe, expect, test } from 'vitest'
import {
  buildChromaticDisplayScale,
  buildScale,
  buildScaleModeGroups,
  C3_MIDI,
  frequencyToNote,
  frequencyToNoteName,
  midiToFlatLabel,
  midiToFrequency,
  midiToNoteLabel,
  noteToFrequency,
  SCALE_MODE_GROUP_ORDER,
  SCALE_MODE_OPTIONS,
  SCALE_MODE_SEMITONES,
} from './noteUtils'
import type { ScaleMode } from './noteUtils'

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

  test('handles very high frequency (C7)', () => {
    const result = frequencyToNote(2093.0)
    expect(result).not.toBeNull()
    expect(result!.note).toBe('C')
    expect(result!.octave).toBe(7)
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

describe('buildScale', () => {
  test.each(Object.keys(SCALE_MODE_SEMITONES) as ScaleMode[])(
    'returns correct note count for mode "%s" starting at 0 and ending at 12',
    (mode) => {
      const semitones = SCALE_MODE_SEMITONES[mode]
      const scale = buildScale(C3_MIDI, mode)
      expect(scale).toHaveLength(semitones.length)
      expect(semitones[0]).toBe(0)
      expect(semitones.at(-1)).toBe(12)
    },
  )

  test('ionian from C3 returns DO RE MI FA SO LA TI DO solfège labels', () => {
    const scale = buildScale(C3_MIDI, 'ionian')
    expect(scale.map((n) => n.solfege)).toEqual([
      'DO',
      'RE',
      'MI',
      'FA',
      'SO',
      'LA',
      'TI',
      'DO',
    ])
  })

  test('harmonicMinor from C3 has raised 7th (B)', () => {
    const scale = buildScale(C3_MIDI, 'harmonicMinor')
    /* harmonicMinor semitones: [0,2,3,5,7,8,11,12] — index 6 (TI) = 11 semitones = B */
    expect(scale[6].note).toBe('B')
    expect(scale[6].solfege).toBe('TI')
  })

  test('phrygianDominant from C3 has flattened 2nd (C#) and major 3rd (E)', () => {
    const scale = buildScale(C3_MIDI, 'phrygianDominant')
    /* phrygianDominant semitones: [0,1,4,5,7,8,10,12] */
    expect(scale[1].note).toBe('C#') // RE = 1 semitone
    expect(scale[2].note).toBe('E') // MI = 4 semitones
  })

  test('leadingWholeTone from C3 has augmented 6th (A#)', () => {
    const scale = buildScale(C3_MIDI, 'leadingWholeTone')
    /* leadingWholeTone semitones: [0,2,4,6,8,10,11,12] — index 5 = 10 = A# */
    expect(scale[5].note).toBe('A#')
  })

  test('uses ionian as default mode', () => {
    const explicit = buildScale(C3_MIDI, 'ionian')
    const defaultMode = buildScale(C3_MIDI)
    expect(defaultMode.map((n) => n.note)).toEqual(explicit.map((n) => n.note))
  })
})

describe('buildChromaticDisplayScale', () => {
  test('returns 13 notes from C3 to C4', () => {
    const scale = buildChromaticDisplayScale(C3_MIDI)

    expect(scale).toHaveLength(13)
    expect(scale[0]).toEqual({ note: 'C', octave: 3, semitone: 0 })
    expect(scale[1]).toEqual({ note: 'C#', octave: 3, semitone: 1 })
    expect(scale[12]).toEqual({ note: 'C', octave: 4, semitone: 12 })
  })

  test('semitone values are 0 through 12', () => {
    const scale = buildChromaticDisplayScale(C3_MIDI)

    expect(scale.map((n) => n.semitone)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ])
  })

  test('works with a non-C root (G3)', () => {
    const g3Midi = C3_MIDI + 7
    const scale = buildChromaticDisplayScale(g3Midi)

    expect(scale).toHaveLength(13)
    expect(scale[0]).toEqual({ note: 'G', octave: 3, semitone: 0 })
    expect(scale[12]).toEqual({ note: 'G', octave: 4, semitone: 12 })
  })
})

describe('buildScale - bebop scales', () => {
  test('majorBebop produces 9 notes with correct solfege labels', () => {
    const scale = buildScale(C3_MIDI, 'majorBebop')

    expect(scale).toHaveLength(9)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[5].solfege).toBe('♭LA')
    expect(scale[6].solfege).toBe('LA')
    expect(scale[8].solfege).toBe('DO')
  })

  test('majorBebop starts and ends on the same note (octave apart)', () => {
    const scale = buildScale(C3_MIDI, 'majorBebop')

    expect(scale[0].note).toBe('C')
    expect(scale[8].note).toBe('C')
    expect(scale[8].octave).toBe(scale[0].octave + 1)
  })

  test('dominantBebop produces 9 notes with chromatic passing tone between ♭7 and 7', () => {
    const scale = buildScale(C3_MIDI, 'dominantBebop')

    expect(scale).toHaveLength(9)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[6].solfege).toBe('♭TI')
    expect(scale[7].solfege).toBe('TI')
    expect(scale[8].solfege).toBe('DO')
  })

  test('minorBebop produces 9 notes', () => {
    const scale = buildScale(C3_MIDI, 'minorBebop')

    expect(scale).toHaveLength(9)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[8].solfege).toBe('DO')
  })

  test('all bebop semitone arrays end at 12 (octave)', () => {
    const bebopModes: ScaleMode[] = [
      'majorBebop',
      'dominantBebop',
      'minorBebop',
    ]

    for (const mode of bebopModes) {
      const semitones = SCALE_MODE_SEMITONES[mode]
      expect(semitones.at(-1)).toBe(12)
    }
  })
})

describe('buildScale - blues & pentatonic scales', () => {
  test('minorPentatonic produces 6 notes', () => {
    const scale = buildScale(C3_MIDI, 'minorPentatonic')

    expect(scale).toHaveLength(6)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[1].solfege).toBe('♭MI')
    expect(scale[5].solfege).toBe('DO')
  })

  test('majorPentatonic produces 6 notes', () => {
    const scale = buildScale(C3_MIDI, 'majorPentatonic')

    expect(scale).toHaveLength(6)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[2].solfege).toBe('MI')
    expect(scale[5].solfege).toBe('DO')
  })

  test('minorBlues produces 7 notes with blue note (♭SO)', () => {
    const scale = buildScale(C3_MIDI, 'minorBlues')

    expect(scale).toHaveLength(7)
    expect(scale[3].solfege).toBe('♭SO')
    expect(scale[4].solfege).toBe('SO')
  })

  test('majorBlues produces 7 notes', () => {
    const scale = buildScale(C3_MIDI, 'majorBlues')

    expect(scale).toHaveLength(7)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[2].solfege).toBe('♭MI')
    expect(scale[3].solfege).toBe('MI')
    expect(scale[6].solfege).toBe('DO')
  })
})

describe('buildScale - symmetric scales', () => {
  test('wholeTone produces 7 notes with equal 2-semitone steps', () => {
    const scale = buildScale(C3_MIDI, 'wholeTone')

    expect(scale).toHaveLength(7)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[3].solfege).toBe('♯FA')
    expect(scale[6].solfege).toBe('DO')
  })

  test('diminishedHalfWhole produces 9 notes', () => {
    const scale = buildScale(C3_MIDI, 'diminishedHalfWhole')

    expect(scale).toHaveLength(9)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[1].solfege).toBe('♭RE')
    expect(scale[8].solfege).toBe('DO')
  })

  test('diminishedWholeHalf produces 9 notes', () => {
    const scale = buildScale(C3_MIDI, 'diminishedWholeHalf')

    expect(scale).toHaveLength(9)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[1].solfege).toBe('RE')
    expect(scale[8].solfege).toBe('DO')
  })

  test('augmented produces 7 notes', () => {
    const scale = buildScale(C3_MIDI, 'augmented')

    expect(scale).toHaveLength(7)
    expect(scale[0].solfege).toBe('DO')
    expect(scale[4].solfege).toBe('♯SO')
    expect(scale[6].solfege).toBe('DO')
  })
})

const C_SHARP_4_MIDI = 61
const F_SHARP_4_MIDI = 66
const C4_MIDI = 60
const E4_MIDI = 64
const B3_MIDI = 59

describe('midiToNoteLabel', () => {
  test('spells accidentals as sharps by default', () => {
    expect(midiToNoteLabel(C_SHARP_4_MIDI).label).toBe('C♯4')
    expect(midiToNoteLabel(C_SHARP_4_MIDI, { showOctave: false }).label).toBe(
      'C♯',
    )
  })

  test('spells accidentals as flats on request', () => {
    expect(midiToNoteLabel(C_SHARP_4_MIDI, { preferFlats: true }).label).toBe(
      'D♭4',
    )
    expect(midiToNoteLabel(F_SHARP_4_MIDI, { preferFlats: true }).label).toBe(
      'G♭4',
    )
    expect(
      midiToNoteLabel(C_SHARP_4_MIDI, { showOctave: false, preferFlats: true })
        .label,
    ).toBe('D♭')
  })

  test('leaves naturals alone in flat spelling', () => {
    /* E and B in particular are never respelled F♭/C♭ — FLAT_NOTE_NAMES only
     * covers the five pitch classes with a flat name worth teaching. */
    expect(midiToNoteLabel(C4_MIDI, { preferFlats: true }).label).toBe('C4')
    expect(midiToNoteLabel(E4_MIDI, { preferFlats: true }).label).toBe('E4')
    expect(midiToNoteLabel(B3_MIDI, { preferFlats: true }).label).toBe('B3')
  })

  test('keeps the sharp note name whatever the spelling', () => {
    /* `note` doubles as a sample key and a Tone.js pitch string, so a flat
     * spelling must never reach it — 'D♭4' matches no sample. */
    const flat = midiToNoteLabel(C_SHARP_4_MIDI, { preferFlats: true })

    expect(flat.note).toBe('C#')
    expect(flat.octave).toBe(4)
  })
})

describe('midiToFlatLabel', () => {
  test('names the five accidentals and nothing else', () => {
    expect(midiToFlatLabel(C_SHARP_4_MIDI)).toBe('D♭')
    expect(midiToFlatLabel(F_SHARP_4_MIDI)).toBe('G♭')
    expect(midiToFlatLabel(C4_MIDI)).toBeNull()
    expect(midiToFlatLabel(E4_MIDI)).toBeNull()
  })
})

describe('buildScaleModeGroups', () => {
  /* Stand-ins for vue-i18n: echo the group id, keep the catalogue's English mode
   * name, so grouping can be asserted without loading the locale files. */
  const groupLabel = (groupId: string) => groupId
  const modeLabel = ({ label }: { label: string }) => label

  const build = (modes?: readonly ScaleMode[]) =>
    buildScaleModeGroups({ groupLabel, modeLabel, modes })

  test('orders the groups as SCALE_MODE_GROUP_ORDER declares', () => {
    expect(build().map((group) => group.id)).toEqual(SCALE_MODE_GROUP_ORDER)
  })

  test('offers every mode exactly once', () => {
    const ids = build().flatMap((group) => group.items.map((item) => item.id))

    expect(ids.sort()).toEqual(SCALE_MODE_OPTIONS.map((o) => o.id).sort())
  })

  test('leads with the two names everyone knows', () => {
    const [popular] = build()

    expect(popular.id).toBe('popular')
    expect(popular.items.slice(0, 2).map((item) => item.id)).toEqual([
      'ionian',
      'aeolian',
    ])
  })

  test('drops groups left empty by a subset', () => {
    const groups = build(['ionian', 'lydian', 'augmented'])

    expect(groups.map((group) => group.id)).toEqual([
      'popular',
      'church',
      'symmetric',
    ])
  })

  test('keeps catalogue order regardless of the order modes are listed in', () => {
    const groups = build(['minorBlues', 'aeolian', 'ionian'])

    expect(groups[0].items.map((item) => item.id)).toEqual([
      'ionian',
      'aeolian',
      'minorBlues',
    ])
  })
})

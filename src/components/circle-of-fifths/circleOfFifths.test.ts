import { describe, expect, test } from 'vitest'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { pitchClassOf } from '@/utils/scaleHighlight'
import {
  accidentalCountLabel,
  buildWalkSteps,
  chromaticAngle,
  CIRCLE_DIRECTIONS,
  CIRCLE_KEYS,
  fifthsAngle,
  nextKeyIndex,
  placePattern,
  keyIndexOfPitchClass,
  placePitchClass,
  wheelNoteLabel,
  walkKeyOrder,
  walkWindow,
} from './circleOfFifths'

const keyByLabel = (label: string) => {
  const key = CIRCLE_KEYS.find((candidate) => candidate.label === label)
  if (!key) throw new Error(`No key labelled ${label}`)

  return key
}

describe('circleOfFifths - keys', () => {
  test('lists the 12 major keys in circle-of-fifths order', () => {
    expect(CIRCLE_KEYS.map((key) => key.label)).toEqual([
      'C',
      'G',
      'D',
      'A',
      'E',
      'B',
      'F♯',
      'D♭',
      'A♭',
      'E♭',
      'B♭',
      'F',
    ])
  })

  test('steps a fifth (7 semitones) between neighbours', () => {
    CIRCLE_KEYS.forEach((key, index) => {
      const next = CIRCLE_KEYS[(index + 1) % 12]
      expect(pitchClassOf(next.pitchClass - key.pitchClass)).toBe(7)
    })
  })

  test.each([
    { label: 'C', count: 0, type: null, notes: [] },
    { label: 'G', count: 1, type: 'sharp', notes: ['F♯'] },
    { label: 'D', count: 2, type: 'sharp', notes: ['F♯', 'C♯'] },
    {
      label: 'F♯',
      count: 6,
      type: 'sharp',
      notes: ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯'],
    },
    {
      label: 'D♭',
      count: 5,
      type: 'flat',
      notes: ['B♭', 'E♭', 'A♭', 'D♭', 'G♭'],
    },
    { label: 'F', count: 1, type: 'flat', notes: ['B♭'] },
  ])(
    'gives $label a key signature of $count',
    ({ label, count, type, notes }) => {
      const key = keyByLabel(label)
      expect(key.accidentalCount).toBe(count)
      expect(key.accidentalType).toBe(type)
      expect(key.signatureNotes).toEqual(notes)
    },
  )

  test.each([
    { label: 'C', minor: 'Am' },
    { label: 'G', minor: 'Em' },
    { label: 'B', minor: 'G♯m' },
    { label: 'F♯', minor: 'D♯m' },
    { label: 'D♭', minor: 'B♭m' },
    { label: 'F', minor: 'Dm' },
  ])('pairs $label with relative minor $minor', ({ label, minor }) => {
    expect(keyByLabel(label).minorLabel).toBe(minor)
  })

  test('spells the bottom of the circle both ways', () => {
    const key = keyByLabel('F♯')
    expect(key.alternateLabel).toBe('G♭')
    expect(key.alternateMinorLabel).toBe('E♭m')
    expect(CIRCLE_KEYS.filter((other) => other.alternateLabel)).toHaveLength(1)
  })

  test.each([
    { label: 'C', expected: '' },
    { label: 'A', expected: '3♯' },
    { label: 'F♯', expected: '6♯/6♭' },
    { label: 'B♭', expected: '2♭' },
  ])('labels the accidental count of $label as "$expected"', (row) => {
    expect(accidentalCountLabel(keyByLabel(row.label))).toBe(row.expected)
  })
})

describe('circleOfFifths - navigation', () => {
  test('wraps around in both directions', () => {
    expect(nextKeyIndex(11, 'clockwise')).toBe(0)
    expect(nextKeyIndex(0, 'counterClockwise')).toBe(11)
  })

  test('walks clockwise through the sharps and back to C', () => {
    const labels = walkKeyOrder('clockwise').map(
      (index) => CIRCLE_KEYS[index].label,
    )
    expect(labels.slice(0, 4)).toEqual(['C', 'G', 'D', 'A'])
    expect(labels).toHaveLength(13)
    expect(labels.at(-1)).toBe('C')
  })

  test('walks counter-clockwise through the flats (the circle of fourths)', () => {
    const labels = walkKeyOrder('counterClockwise').map(
      (index) => CIRCLE_KEYS[index].label,
    )
    expect(labels.slice(0, 4)).toEqual(['C', 'F', 'B♭', 'E♭'])
  })

  test('finds each key from its pitch class', () => {
    CIRCLE_KEYS.forEach((key) => {
      expect(keyIndexOfPitchClass(key.pitchClass)).toBe(key.index)
    })
  })

  test('spells every note the way its wedge is labelled', () => {
    /* C4 = MIDI 60, one octave of pitch classes from there */
    for (let midi = 60; midi < 72; midi++) {
      const key = CIRCLE_KEYS[keyIndexOfPitchClass(midi)]
      expect(wheelNoteLabel(midi)).toBe(`${key.label}4`)
    }
  })

  test.each([
    { midi: 56, label: 'A♭3' },
    { midi: 61, label: 'D♭4' },
    { midi: 66, label: 'F♯4' },
  ])('spells MIDI $midi as $label', ({ midi, label }) => {
    expect(wheelNoteLabel(midi)).toBe(label)
  })

  test.each([
    { midi: 48, label: 'C' },
    { midi: 60, label: 'C' },
    { midi: 62, label: 'D' },
    { midi: 66, label: 'F♯' },
    { midi: 70, label: 'B♭' },
  ])('finds the key of MIDI $midi', ({ midi, label }) => {
    expect(CIRCLE_KEYS[keyIndexOfPitchClass(midi)].label).toBe(label)
  })
})

describe('circleOfFifths - angles', () => {
  test('places each key on the chromatic circle at its pitch class', () => {
    CIRCLE_KEYS.forEach((key) => {
      expect(chromaticAngle(key.index) % 360).toBe(key.pitchClass * 30)
    })
  })

  test('moves every key by exactly 0° or 180° between the views', () => {
    CIRCLE_KEYS.forEach((key) => {
      const shift = chromaticAngle(key.index) - fifthsAngle(key.index)
      expect([0, 180]).toContain(shift)
    })
  })
})

describe('circleOfFifths - voice range placement', () => {
  test('places a pitch class once inside a 12-note window', () => {
    const window = { midiMin: 55, midiMax: 66 }
    expect(placePitchClass(0, window)).toBe(60)
    expect(placePitchClass(7, window)).toBe(55)
    expect(placePitchClass(6, window)).toBe(66)
  })

  test('walks G3–G4 clockwise and ends back on C4', () => {
    const steps = buildWalkSteps('clockwise', { midiMin: 55, midiMax: 67 })
    expect(steps.map((step) => step.rootMidi)).toEqual([
      60, 55, 62, 57, 64, 59, 66, 61, 56, 63, 58, 65,
    ])
    expect(steps.at(-1)?.nextMidi).toBe(60)
  })

  const rangeCases = VOICE_RANGES.flatMap((range) =>
    CIRCLE_DIRECTIONS.map((direction) => ({
      name: range.labelKey,
      direction,
      range,
    })),
  )

  test.each(rangeCases)(
    'keeps every $direction step of $name inside the range',
    ({ direction, range }) => {
      const window = walkWindow(range)
      const steps = buildWalkSteps(direction, range)
      const order = walkKeyOrder(direction)

      expect(window.midiMax - window.midiMin).toBe(11)
      expect(steps).toHaveLength(12)
      steps.forEach((step, index) => {
        expect(step.keyIndex).toBe(order[index])
        expect(pitchClassOf(step.rootMidi)).toBe(
          CIRCLE_KEYS[step.keyIndex].pitchClass,
        )
        for (const midi of [step.rootMidi, step.nextMidi]) {
          expect(midi).toBeGreaterThanOrEqual(range.midiMin)
          expect(midi).toBeLessThanOrEqual(range.midiMax)
        }
        if (index > 0) expect(step.rootMidi).toBe(steps[index - 1].nextMidi)
      })
    },
  )

  test.each(VOICE_RANGES.map((range) => ({ name: range.labelKey, range })))(
    'keeps DO MI SO within 3 semitones of $name',
    ({ range }) => {
      const offsets = [0, 4, 7]
      CIRCLE_KEYS.forEach((key) => {
        const tonic = placePattern(key.pitchClass, offsets, range)
        expect(pitchClassOf(tonic)).toBe(key.pitchClass)
        expect(tonic).toBeGreaterThanOrEqual(range.midiMin - 3)
        expect(tonic + 7).toBeLessThanOrEqual(range.midiMax + 3)
      })
    },
  )
})

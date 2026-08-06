import { describe, expect, it } from 'vitest'
import {
  buildGuitarTuningGroups,
  GUITAR_TUNING_IDS,
  GUITAR_TUNINGS,
  guitarTuningStringPairs,
  guitarTuningStrings,
  isGuitarTuningId,
  type GuitarTuningId,
} from './guitarTunings'

describe('GUITAR_TUNINGS', () => {
  it('gives every tuning six strings, lowest first', () => {
    GUITAR_TUNING_IDS.forEach((id) => {
      const { midi } = GUITAR_TUNINGS[id]
      expect(midi, id).toHaveLength(6)
      expect([...midi], id).toEqual([...midi].sort((a, b) => a - b))
    })
  })

  it('names every tuning either by its letters or by a translation key', () => {
    GUITAR_TUNING_IDS.forEach((id) => {
      const { label, labelKey } = GUITAR_TUNINGS[id]
      expect(label ?? labelKey, id).toBeTruthy()
    })
  })
})

describe('isGuitarTuningId', () => {
  it('accepts a known id and rejects anything else', () => {
    expect(isGuitarTuningId('dadgad')).toBe(true)
    /* What a stale localStorage value looks like. */
    expect(isGuitarTuningId('halfStepDown')).toBe(false)
    expect(isGuitarTuningId(null)).toBe(false)
  })
})

describe('guitarTuningStrings', () => {
  /*
   * The note/octave spelling of every tuning, as the tuner's string buttons and
   * the guitar sampler's keys need it. This is the table the tuner used to own
   * outright, kept here so the shared catalogue cannot silently respell a string.
   */
  const EXPECTED: Record<GuitarTuningId, string[]> = {
    standard: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    ebStandard: ['D#2', 'G#2', 'C#3', 'F#3', 'A#3', 'D#4'],
    dropD: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
    dropC: ['C2', 'G2', 'C3', 'F3', 'A3', 'D4'],
    openG: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'],
    openD: ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'],
    openC: ['C2', 'G2', 'C3', 'G3', 'C4', 'E4'],
    dadgad: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'],
  }

  it('spells each tuning strings 6 to 1', () => {
    GUITAR_TUNING_IDS.forEach((id) => {
      const spelled = guitarTuningStrings(id).map(
        ({ note, octave }) => `${note}${octave}`,
      )
      expect(spelled, id).toEqual(EXPECTED[id])
    })
  })

  it('uses raw sharp names, not display glyphs', () => {
    /* A '♯' would match no sample key in useGuitarSampler. */
    expect(guitarTuningStrings('ebStandard')[0].note).toBe('D#')
  })
})

describe('guitarTuningStringPairs', () => {
  it('splits the strings the way the tuner draws them', () => {
    /* Inline-start column is strings 4, 5, 6 top to bottom; inline-end is 3, 2, 1. */
    const { left, right } = guitarTuningStringPairs('dropC')

    expect(left).toEqual([
      { note: 'C', octave: 3 },
      { note: 'G', octave: 2 },
      { note: 'C', octave: 2 },
    ])
    expect(right).toEqual([
      { note: 'F', octave: 3 },
      { note: 'A', octave: 3 },
      { note: 'D', octave: 4 },
    ])
  })

  it('keeps every string exactly once', () => {
    GUITAR_TUNING_IDS.forEach((id) => {
      const { left, right } = guitarTuningStringPairs(id)
      expect([...left, ...right], id).toHaveLength(6)
    })
  })
})

describe('buildGuitarTuningGroups', () => {
  /* Stand-in for vue-i18n's t: echoes the key so grouping and label choice can be
   * asserted without loading the locale files. */
  const t = (key: string) => key

  it('groups the tunings standard, drop, open, then alternate', () => {
    const groups = buildGuitarTuningGroups(t)

    expect(groups.map((group) => group.label)).toEqual([
      'tuner.tuningGroups.standard',
      'tuner.tuningGroups.drop',
      'tuner.tuningGroups.open',
      'tuner.tuningGroups.alternate',
    ])
  })

  it('offers every tuning exactly once', () => {
    const values = buildGuitarTuningGroups(t).flatMap((group) =>
      group.items.map((item) => item.value),
    )

    expect(values.sort()).toEqual([...GUITAR_TUNING_IDS].sort())
  })

  it('prefers spelled-out letters and falls back to a translated name', () => {
    const [standardGroup] = buildGuitarTuningGroups(t)

    expect(standardGroup.items).toEqual([
      { label: 'EADGBE', value: 'standard' },
      { label: 'tuner.tuningItems.ebStandard', value: 'ebStandard' },
    ])
  })
})

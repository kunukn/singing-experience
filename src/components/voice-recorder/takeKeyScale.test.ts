import { describe, expect, test } from 'vitest'

import { detectScales } from '@/utils/scaleDetection'

import type { NoteUse } from './analyzeTake'
import {
  familiarTwins,
  scaleNoteChips,
  scalePreviewRootMidi,
} from './takeKeyScale'

const C_SHARP = 1
const F = 5
const G = 7
const B_FLAT = 10

const C_SHARP_3_MIDI = 49
const D3_MIDI = 50
const F3_MIDI = 53
const G_SHARP_3_MIDI = 56
const C_SHARP_4_MIDI = 61

function notesUsedAt(...midis: number[]): NoteUse[] {
  return midis.map((midi) => ({ midi, totalMs: 200 }))
}

describe('familiarTwins', () => {
  const twinsOf = (...midis: number[]) =>
    familiarTwins(
      detectScales(midis.map((midi) => ({ midi, durationMs: 500 }))).families[0]
        .candidates,
    ).map(({ root, mode }) => ({ root, mode }))

  test('names the major and minor scales for a church mode home', () => {
    /* F G A B♭ C D E♭ F */
    expect(twinsOf(65, 67, 69, 70, 72, 74, 75, 77)).toEqual([
      { root: B_FLAT, mode: 'ionian' },
      { root: G, mode: 'aeolian' },
    ])
  })

  test.each([
    { name: 'major', midis: [60, 62, 64, 65, 67, 69, 71, 72] },
    { name: 'minor', midis: [57, 59, 60, 62, 64, 65, 67, 69] },
    { name: 'pentatonic', midis: [60, 62, 64, 67, 69] },
    /* F G♭ A B♭ C D♭ E♭ F */
    { name: 'Phrygian Dominant', midis: [65, 66, 69, 70, 72, 73, 75, 77] },
  ])('returns nothing for a $name home', ({ midis }) => {
    expect(twinsOf(...midis)).toEqual([])
  })
})

describe('scalePreviewRootMidi', () => {
  test('returns the highest root below the lowest sung note', () => {
    const notesUsed = notesUsedAt(C_SHARP_4_MIDI, G_SHARP_3_MIDI, D3_MIDI)

    expect(scalePreviewRootMidi(C_SHARP, notesUsed)).toBe(C_SHARP_3_MIDI)
  })

  test('returns the lowest sung note when it is the root', () => {
    const notesUsed = notesUsedAt(C_SHARP_4_MIDI, C_SHARP_3_MIDI)

    expect(scalePreviewRootMidi(C_SHARP, notesUsed)).toBe(C_SHARP_3_MIDI)
  })
})

describe('scaleNoteChips', () => {
  const key = { root: C_SHARP, mode: 'phrygianDominant' } as const
  const notesUsed = notesUsedAt(
    C_SHARP_4_MIDI,
    G_SHARP_3_MIDI,
    F3_MIDI,
    D3_MIDI,
  )

  test('lists the scale from the root without repeating it at the octave', () => {
    expect(scaleNoteChips(key, notesUsed).map((chip) => chip.label)).toEqual([
      'C♯',
      'D',
      'F',
      'F♯',
      'G♯',
      'A',
      'B',
    ])
  })

  test('marks the notes that were sung in any octave', () => {
    const sungLabels = scaleNoteChips(key, notesUsed)
      .filter((chip) => chip.isSung)
      .map((chip) => chip.label)

    expect(sungLabels).toEqual(['C♯', 'D', 'F', 'G♯'])
  })

  test('spells a flat key with flats', () => {
    const labels = scaleNoteChips({ root: F, mode: 'ionian' }, []).map(
      (chip) => chip.label,
    )

    expect(labels).toEqual(['F', 'G', 'A', 'B♭', 'C', 'D', 'E'])
  })
})

import { describe, expect, test } from 'vitest'

import type { NoteUse } from './analyzeTake'
import { scaleNoteChips, scalePreviewRootMidi } from './takeKeyScale'

const C_SHARP = 1
const F = 5

const C_SHARP_3_MIDI = 49
const D3_MIDI = 50
const F3_MIDI = 53
const G_SHARP_3_MIDI = 56
const C_SHARP_4_MIDI = 61

function notesUsedAt(...midis: number[]): NoteUse[] {
  return midis.map((midi) => ({ midi, totalMs: 200 }))
}

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

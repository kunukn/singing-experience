import { describe, expect, test } from 'vitest'
import { quantizeNotes } from './quantizeNotes'
import { buildRecordingAbc } from './songRecorderAbc'
import { parseAbcImport } from './songRecorderAbcImport'
import type { Grid } from './songRecorderConstants'

type ImportOptions = { bpm: number; grid: Grid }

const OPTIONS: ImportOptions = { bpm: 90, grid: 8 }

function importOk(text: string, options: ImportOptions = OPTIONS) {
  const result = parseAbcImport(text, options)
  if (!result.ok) throw new Error(`import failed: ${result.error}`)

  return result
}

describe('parseAbcImport', () => {
  test('round-trips the recorder’s own export', () => {
    const notes = [
      { midi: 59, startUnit: 0, units: 1 },
      { midi: 61, startUnit: 1, units: 1 },
      { midi: 60, startUnit: 2, units: 2 },
      { midi: null, startUnit: 4, units: 1 },
      { midi: 67, startUnit: 5, units: 5 },
      { midi: null, startUnit: 10, units: 6 },
    ]
    const options = {
      bpm: 90,
      grid: 8,
      beatsPerBar: 4,
      clef: 'treble',
    } as const
    const { abc } = buildRecordingAbc(notes, options)

    const result = importOk(abc)

    expect(quantizeNotes(result.events, options)).toEqual(notes)
    expect(result.notices).toEqual([])
  })

  test('applies the key signature and merges ties', () => {
    const result = importOk('X:1\nM:4/4\nL:1/4\nK:G\nF G A2- | A4 |]')

    expect(result.events.map((event) => event.midi)).toEqual([66, 67, 69])
    /* 90 BPM → a quarter is 666.7 ms; the tied A lasts 1.5 bars = 6 quarters. */
    expect(result.events[2].endMs - result.events[2].startMs).toBeCloseTo(
      6 * (60_000 / 90),
    )
  })

  test('keeps the top note of a chord', () => {
    const result = importOk('X:1\nL:1/4\nK:C\n[CEG] c d e |]')

    expect(result.events.map((event) => event.midi)).toEqual([67, 72, 74, 76])
    expect(result.notices).toContain('chords')
  })

  test('keeps only the first voice', () => {
    const result = importOk('X:1\nL:1/4\nK:C\nV:1\nc d e f|\nV:2\nC D E F|')

    expect(result.events.map((event) => event.midi)).toEqual([72, 74, 76, 77])
    expect(result.notices).toContain('voices')
  })

  test('switches to a 1/16 grid when the rhythm needs it', () => {
    const result = importOk('X:1\nL:1/16\nK:C\nC D E2 F4 G8 |]')

    expect(result.grid).toBe(16)
    expect(result.notices).not.toContain('rhythm')
  })

  test('notes rhythms finer than 1/16, like triplets', () => {
    const result = importOk('X:1\nL:1/8\nK:C\n(3CDE F2 G4 |]')

    expect(result.grid).toBe(16)
    expect(result.notices).toContain('rhythm')
  })

  test('takes the tempo, snapped to an allowed BPM', () => {
    const result = importOk('X:1\nQ:1/4=72\nL:1/4\nK:C\nc d e f |]')

    expect(result.bpm).toBe(70)
    expect(result.notices).toContain('tempo')
  })

  test('converts a half-note tempo to quarter-note BPM', () => {
    expect(importOk('X:1\nQ:1/2=60\nL:1/4\nK:C\nc d e f |]').bpm).toBe(120)
  })

  test('keeps the current BPM when there is no tempo', () => {
    const result = importOk('X:1\nL:1/4\nK:C\nc d e f |]', {
      bpm: 110,
      grid: 8,
    })

    expect(result.bpm).toBe(110)
    expect(result.notices).not.toContain('tempo')
  })

  test('reads the bass clef', () => {
    expect(importOk('X:1\nL:1/4\nK:C clef=bass\nC, D, E, F, |]').clef).toBe(
      'bass',
    )
  })

  test('places a pickup so it ends on the first bar line', () => {
    const result = importOk('X:1\nM:4/4\nL:1/8\nK:C\nG | c8 |]')

    /* The eighth-note pickup starts 7 eighths into an empty first bar. */
    expect(
      quantizeNotes(result.events, { bpm: 90, grid: 8, beatsPerBar: 4 })[1],
    ).toEqual({ midi: 67, startUnit: 7, units: 1 })
  })

  test('rejects meters other than 4/4', () => {
    expect(parseAbcImport('X:1\nM:3/4\nL:1/4\nK:C\nc d e |]', OPTIONS)).toEqual(
      {
        ok: false,
        error: 'meter',
      },
    )
  })

  test('rejects text with parse warnings, without HTML in the detail', () => {
    const result = parseAbcImport('hello world', OPTIONS)

    expect(result.ok).toBe(false)
    if (result.ok) return

    expect(result.error).toBe('invalid')
    expect(result.detail).toContain('Unknown character')
    expect(result.detail).not.toContain('<')
  })

  test('rejects ABC without notes', () => {
    expect(parseAbcImport('X:1\nM:4/4\nK:C\n', OPTIONS)).toEqual({
      ok: false,
      error: 'empty',
    })
  })
})

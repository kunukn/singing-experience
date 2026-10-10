import { describe, expect, test } from 'vitest'
import { gridUnitMs, quantizeNotes, unitsPerBar } from './quantizeNotes'

/* 60 BPM: a quarter is 1000 ms, so an eighth step is 500 ms. */
const AT_60 = { bpm: 60, grid: 8, beatsPerBar: 4 }

describe('quantizeNotes', () => {
  test('computes grid step length and bar size', () => {
    expect(gridUnitMs(60, 8)).toBe(500)
    expect(gridUnitMs(120, 16)).toBe(125)
    expect(unitsPerBar(8, 4)).toBe(8)
    expect(unitsPerBar(16, 3)).toBe(12)
  })

  test('maps a 2-second D4 at 60 BPM to a half note, padded to a full bar', () => {
    const notes = quantizeNotes([{ startMs: 30, endMs: 1960, midi: 62 }], AT_60)

    expect(notes).toEqual([
      { midi: 62, startUnit: 0, units: 4 },
      { midi: null, startUnit: 4, units: 4 },
    ])
  })

  test('fills gaps between notes with rests', () => {
    const notes = quantizeNotes(
      [
        { startMs: 0, endMs: 1000, midi: 60 },
        { startMs: 2000, endMs: 4000, midi: 64 },
      ],
      AT_60,
    )

    expect(notes).toEqual([
      { midi: 60, startUnit: 0, units: 2 },
      { midi: null, startUnit: 2, units: 2 },
      { midi: 64, startUnit: 4, units: 4 },
    ])
  })

  test('pushes a note that overlaps the previous one after snapping', () => {
    const notes = quantizeNotes(
      [
        { startMs: 0, endMs: 1300, midi: 60 },
        { startMs: 1200, endMs: 2000, midi: 62 },
      ],
      AT_60,
    )

    expect(notes.slice(0, 2)).toEqual([
      { midi: 60, startUnit: 0, units: 3 },
      { midi: 62, startUnit: 3, units: 1 },
    ])
  })

  test('keeps a short note as one step when it lasts at least half a step', () => {
    const notes = quantizeNotes(
      [{ startMs: 1000, endMs: 1260, midi: 60 }],
      AT_60,
    )

    expect(notes[1]).toEqual({ midi: 60, startUnit: 2, units: 1 })
  })

  test('drops a note shorter than half a step', () => {
    const notes = quantizeNotes(
      [{ startMs: 1000, endMs: 1100, midi: 60 }],
      AT_60,
    )

    expect(notes.every((note) => note.midi === null)).toBe(true)
  })

  test('keeps a half note released 15% early (a breath)', () => {
    /* Measured from the test page's demo melody at 90 BPM: 5.92 → 7.66 beats. */
    const notes = quantizeNotes([{ startMs: 3947, endMs: 5107, midi: 67 }], {
      ...AT_60,
      bpm: 90,
    })

    expect(notes[1]).toEqual({ midi: 67, startUnit: 12, units: 4 })
  })

  test('keeps a real eighth rest after a quarter note', () => {
    const notes = quantizeNotes(
      [
        { startMs: 0, endMs: 980, midi: 60 },
        { startMs: 1500, endMs: 2000, midi: 62 },
      ],
      AT_60,
    )

    expect(notes.slice(0, 3)).toEqual([
      { midi: 60, startUnit: 0, units: 2 },
      { midi: null, startUnit: 2, units: 1 },
      { midi: 62, startUnit: 3, units: 1 },
    ])
  })

  test('keeps a half note that was released a little early', () => {
    /* Voice stops 15% before the end of the half note (a breath). */
    const notes = quantizeNotes([{ startMs: 0, endMs: 1700, midi: 60 }], AT_60)

    expect(notes[0]).toEqual({ midi: 60, startUnit: 0, units: 4 })
  })

  test('returns nothing when no notes were heard', () => {
    expect(quantizeNotes([], AT_60)).toEqual([])
  })

  test('resolves finer rhythms on a 1/16 grid', () => {
    const notes = quantizeNotes([{ startMs: 0, endMs: 250, midi: 60 }], {
      ...AT_60,
      grid: 16,
    })

    expect(notes[0]).toEqual({ midi: 60, startUnit: 0, units: 1 })
  })

  test('leaves the last bar open when padLastBar is false', () => {
    const notes = quantizeNotes([{ startMs: 30, endMs: 1960, midi: 62 }], {
      ...AT_60,
      padLastBar: false,
    })

    expect(notes).toEqual([{ midi: 62, startUnit: 0, units: 4 }])
  })
})

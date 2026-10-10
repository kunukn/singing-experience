import { describe, expect, test } from 'vitest'
import {
  buildLiveRecordingNotes,
  findPieceAtUnit,
  type LiveNote,
} from './liveRecordingNotes'
import { buildRecordingAbc } from './songRecorderAbc'

/* 60 BPM on a 1/8 grid: a step is 500 ms, a 4/4 bar is 8 steps. */
const BASE = {
  captured: [],
  openNote: null,
  nowUnit: -1,
  unitMs: 500,
  barUnits: 8,
  totalUnits: 64,
}

function kinds(notes: LiveNote[]) {
  return notes.map((note) => note.kind)
}

describe('buildLiveRecordingNotes', () => {
  test('shows two bars of template slots during the count-in', () => {
    const notes = buildLiveRecordingNotes(BASE)

    expect(notes).toHaveLength(16)
    expect(notes.every((note) => note.kind === 'template')).toBe(true)
    expect(notes.every((note) => note.units === 1)).toBe(true)
  })

  test('turns passed silence into one captured rest before the template', () => {
    const notes = buildLiveRecordingNotes({ ...BASE, nowUnit: 3 })

    expect(notes[0]).toEqual({
      midi: null,
      startUnit: 0,
      units: 3,
      kind: 'captured',
    })
    expect(notes[1]).toEqual({
      midi: null,
      startUnit: 3,
      units: 1,
      kind: 'template',
    })
    expect(notes.at(-1)?.startUnit).toBe(15)
  })

  test('grows the open note as a ghost up to the current slot', () => {
    const openNote = { startMs: 1000, midi: 62 }
    const early = buildLiveRecordingNotes({ ...BASE, openNote, nowUnit: 2 })
    const later = buildLiveRecordingNotes({ ...BASE, openNote, nowUnit: 5 })

    expect(early.find((note) => note.kind === 'ghost')).toEqual({
      midi: 62,
      startUnit: 2,
      units: 1,
      kind: 'ghost',
    })
    expect(later.find((note) => note.kind === 'ghost')?.units).toBe(4)
    expect(later[0]).toEqual({
      midi: null,
      startUnit: 0,
      units: 2,
      kind: 'captured',
    })
  })

  test('ties a ghost that crosses the bar line', () => {
    const notes = buildLiveRecordingNotes({
      ...BASE,
      openNote: { startMs: 3000, midi: 67 },
      nowUnit: 9,
    })
    const { abc } = buildRecordingAbc(notes, {
      bpm: 60,
      grid: 8,
      beatsPerBar: 4,
      clef: 'treble',
    })

    expect(abc.split('\n').at(-1)).toMatch(/^z6 G2- \| G2 z z z z z z/)
  })

  test('starts the template after a captured note rounded past the playhead', () => {
    const notes = buildLiveRecordingNotes({
      ...BASE,
      captured: [{ midi: 60, startUnit: 0, units: 3 }],
      nowUnit: 2,
    })

    expect(kinds(notes).slice(0, 2)).toEqual(['captured', 'template'])
    expect(notes[1].startUnit).toBe(3)
  })

  test('never draws template past the end of the take', () => {
    const notes = buildLiveRecordingNotes({ ...BASE, nowUnit: 60 })

    expect(notes.at(-1)).toEqual({
      midi: null,
      startUnit: 63,
      units: 1,
      kind: 'template',
    })
  })
})

describe('findPieceAtUnit', () => {
  const pieces = [
    { noteIndex: 0, startUnit: 0, units: 4, isRest: false },
    { noteIndex: 1, startUnit: 4, units: 1, isRest: true },
  ]

  test('finds the piece covering a grid step', () => {
    expect(findPieceAtUnit(pieces, 3)).toBe(0)
    expect(findPieceAtUnit(pieces, 4)).toBe(1)
  })

  test('returns null before the take and past the last piece', () => {
    expect(findPieceAtUnit(pieces, -1)).toBeNull()
    expect(findPieceAtUnit(pieces, 5)).toBeNull()
  })
})

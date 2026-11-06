import { describe, expect, test } from 'vitest'

import { buildTakeNotes } from './takeNotes'

const HOP_MS = 20

function frameIndexAt(timeMs: number) {
  return Math.round(timeMs / HOP_MS)
}

/* Tuned pitch per frame: a straight line from `from` to `to` over [startMs, endMs). */
function fillPitch(
  tunedMidi: Float32Array,
  startMs: number,
  endMs: number,
  from: number,
  to = from,
) {
  const first = frameIndexAt(startMs)
  const last = frameIndexAt(endMs) - 1
  for (let frame = first; frame <= last; frame++) {
    const progress = last === first ? 0 : (frame - first) / (last - first)
    tunedMidi[frame] = from + (to - from) * progress
  }
}

function silentTrack(durationMs: number) {
  return new Float32Array(frameIndexAt(durationMs)).fill(Number.NaN)
}

describe('buildTakeNotes - slides', () => {
  test('folds a short scoop into the note it lands on', () => {
    const tunedMidi = silentTrack(1000)
    fillPitch(tunedMidi, 0, 120, 48.6, 50.4)
    fillPitch(tunedMidi, 140, 1000, 51)

    const notes = buildTakeNotes(
      [
        { startMs: 0, endMs: 120, midi: 49 },
        { startMs: 140, endMs: 1000, midi: 51 },
      ],
      tunedMidi,
      HOP_MS,
      frameIndexAt,
    )

    expect(notes).toHaveLength(1)
    expect(notes[0]).toMatchObject({ startMs: 0, midi: 51, hasSlideIn: true })
  })

  test('keeps a slide separate when it outlasts the note it runs into', () => {
    const tunedMidi = silentTrack(540)
    fillPitch(tunedMidi, 0, 400, 54.4, 52.6)
    fillPitch(tunedMidi, 420, 540, 51)

    const notes = buildTakeNotes(
      [
        { startMs: 0, endMs: 400, midi: 53 },
        { startMs: 420, endMs: 540, midi: 51 },
      ],
      tunedMidi,
      HOP_MS,
      frameIndexAt,
    )

    expect(notes.map((note) => note.midi)).toEqual([53, 51])
    expect(notes[0].isGlide).toBe(true)
    for (const note of notes) {
      expect(Math.abs(note.centsFromGrid)).toBeLessThanOrEqual(50)
    }
  })
})

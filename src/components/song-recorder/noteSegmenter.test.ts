import { describe, expect, test } from 'vitest'
import { createNoteSegmenter } from './noteSegmenter'
import { ONSET_LATENCY_MS, RELEASE_LATENCY_MS } from './songRecorderConstants'

/* ~60 fps, like the rAF-driven detector. */
const FRAME_MS = 16

/* Feeds `midi` (or silence) every frame from `fromMs` up to (not incl.) `toMs`. */
function feed(
  segmenter: ReturnType<typeof createNoteSegmenter>,
  fromMs: number,
  toMs: number,
  midi: number | ((timeMs: number) => number | null) | null,
) {
  for (let timeMs = fromMs; timeMs < toMs; timeMs += FRAME_MS) {
    segmenter.push(timeMs, typeof midi === 'function' ? midi(timeMs) : midi)
  }
}

describe('noteSegmenter', () => {
  test('emits one note for a held pitch, shifted back by the detection latency', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 1000, 3000, 62)
    const [note, ...rest] = segmenter.flush()

    expect(rest).toHaveLength(0)
    expect(note.midi).toBe(62)
    expect(note.startMs).toBe(1000 - ONSET_LATENCY_MS)
    expect(note.endMs).toBe(2984 - RELEASE_LATENCY_MS)
  })

  test('reports the note still sounding, then nothing once it closes', () => {
    const segmenter = createNoteSegmenter()
    expect(segmenter.openNote()).toBeNull()

    feed(segmenter, 1000, 1500, 64)
    expect(segmenter.openNote()).toEqual({
      startMs: 1000 - ONSET_LATENCY_MS,
      midi: 64,
    })

    segmenter.flush()
    expect(segmenter.openNote()).toBeNull()
  })

  test('snaps an off-key note to the nearest semitone', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 1000, 61.7)

    expect(segmenter.flush()[0].midi).toBe(62)
  })

  test('closes a note only after the silence lasts long enough', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 500, 60)
    feed(segmenter, 500, 530, null)
    expect(segmenter.events).toHaveLength(0)

    feed(segmenter, 530, 600, null)
    expect(segmenter.events).toHaveLength(1)
  })

  test('bridges a short dropout on the same pitch', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 500, 60)
    feed(segmenter, 500, 532, null)
    feed(segmenter, 532, 1000, 60)

    expect(segmenter.flush()).toHaveLength(1)
  })

  test('splits repeated syllables on the same pitch', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 400, 60)
    feed(segmenter, 400, 500, null)
    feed(segmenter, 500, 900, 60)

    expect(segmenter.flush().map((note) => note.midi)).toEqual([60, 60])
  })

  test('splits on a held pitch change, back-dated to where it began', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 496, 60)
    feed(segmenter, 496, 1000, 64)
    const notes = segmenter.flush()

    expect(notes.map((note) => note.midi)).toEqual([60, 64])
    expect(notes[1].startMs).toBe(496 - RELEASE_LATENCY_MS)
    expect(notes[0].endMs).toBe(notes[1].startMs)
  })

  test('ignores a brief octave jump inside a note', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 1000, (timeMs) =>
      timeMs >= 400 && timeMs < 448 ? 72 : 60,
    )

    expect(segmenter.flush().map((note) => note.midi)).toEqual([60])
  })

  test('ignores vibrato around the note', () => {
    const segmenter = createNoteSegmenter()
    /* ±0.4 semitone at ~6 Hz — wide but never crossing the next semitone's
     * rounding boundary for longer than a frame or two. */
    feed(segmenter, 0, 1500, (timeMs) => 62 + 0.4 * Math.sin(timeMs / 26))

    expect(segmenter.flush().map((note) => note.midi)).toEqual([62])
  })

  test('keeps the start of a note that scoops up into its pitch', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 48, 58)
    feed(segmenter, 48, 800, 60)
    const notes = segmenter.flush()

    expect(notes).toHaveLength(1)
    expect(notes[0].midi).toBe(60)
    expect(notes[0].startMs).toBe(-ONSET_LATENCY_MS)
  })

  test('drops blips shorter than a note', () => {
    const segmenter = createNoteSegmenter()
    feed(segmenter, 0, 48, 60)
    feed(segmenter, 48, 200, null)

    expect(segmenter.flush()).toHaveLength(0)
  })
})

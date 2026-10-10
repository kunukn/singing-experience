import { describe, expect, test } from 'vitest'
import { createPianoChordCapture } from './pianoChordCapture'

const MIN_NOTE_MS = 300

describe('createPianoChordCapture', () => {
  test('keeps every key of a chord pressed in the same instant', () => {
    const capture = createPianoChordCapture({ minNoteMs: MIN_NOTE_MS })
    capture.press(60, 0)
    capture.press(64, 0)
    capture.press(67, 0)
    capture.release(60, 1000)
    capture.release(64, 1000)
    capture.release(67, 1000)

    expect(capture.snapshot().map((event) => event.midi)).toEqual([60, 64, 67])
    expect(capture.isAnyHeld()).toBe(false)
  })

  test('shows held keys before they are let go', () => {
    const capture = createPianoChordCapture({ minNoteMs: MIN_NOTE_MS })
    capture.press(60, 100)

    expect(capture.isAnyHeld()).toBe(true)
    expect(capture.snapshot()).toEqual([
      { startMs: 100, endMs: 100 + MIN_NOTE_MS, midi: 60 },
    ])
  })

  test('stretches a quick tap to the minimum length', () => {
    const capture = createPianoChordCapture({ minNoteMs: MIN_NOTE_MS })
    capture.press(60, 0)

    expect(capture.release(60, 50)).toBe(true)
    expect(capture.snapshot()).toEqual([
      { startMs: 0, endMs: MIN_NOTE_MS, midi: 60 },
    ])
  })

  test('ignores releasing a key that was not held', () => {
    const capture = createPianoChordCapture({ minNoteMs: MIN_NOTE_MS })

    expect(capture.release(60, 100)).toBe(false)
    expect(capture.snapshot()).toEqual([])
  })

  test('flush ends every held key', () => {
    const capture = createPianoChordCapture({ minNoteMs: MIN_NOTE_MS })
    capture.press(60, 0)
    capture.press(64, 0)
    capture.flush(1000)

    expect(capture.isAnyHeld()).toBe(false)
    expect(capture.snapshot().map((event) => event.endMs)).toEqual([1000, 1000])
  })
})

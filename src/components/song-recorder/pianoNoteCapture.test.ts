import { describe, expect, test } from 'vitest'
import { createPianoNoteCapture } from './pianoNoteCapture'

const MIN_NOTE_MS = 100
const EARLY_PRESS_TOLERANCE_MS = 150

const createCapture = () =>
  createPianoNoteCapture({
    minNoteMs: MIN_NOTE_MS,
    earlyPressToleranceMs: EARLY_PRESS_TOLERANCE_MS,
  })

describe('createPianoNoteCapture', () => {
  test('records a press and release as one note', () => {
    const capture = createCapture()

    expect(capture.press(60, 0)).toBe(false)
    expect(capture.release(60, 500)).toBe(true)

    expect(capture.events).toEqual([{ startMs: 0, endMs: 500, midi: 60 }])
  })

  test('ends the held note when the next key goes down', () => {
    const capture = createCapture()

    capture.press(60, 0)
    expect(capture.press(62, 400)).toBe(true)

    expect(capture.events).toEqual([{ startMs: 0, endMs: 400, midi: 60 }])
    expect(capture.heldMidi()).toBe(62)
  })

  test('reports the held note with its start until released', () => {
    const capture = createCapture()

    capture.press(60, 250)
    expect(capture.heldNote()).toEqual({ midi: 60, startMs: 250 })

    capture.release(60, 600)
    expect(capture.heldNote()).toBeNull()
  })

  test('ignores the release of a key that is no longer the held note', () => {
    const capture = createCapture()

    capture.press(60, 0)
    capture.press(62, 400)
    expect(capture.release(60, 450)).toBe(false)

    expect(capture.heldMidi()).toBe(62)
    expect(capture.events).toHaveLength(1)
  })

  test('stretches a quick tap to the minimum note length', () => {
    const capture = createCapture()

    capture.press(60, 1000)
    capture.release(60, 1020)

    expect(capture.events).toEqual([
      { startMs: 1000, endMs: 1000 + MIN_NOTE_MS, midi: 60 },
    ])
  })

  test('cuts a stretched tap back to the next press', () => {
    const capture = createCapture()

    capture.press(60, 1000)
    capture.release(60, 1020)
    expect(capture.press(62, 1050)).toBe(true)

    expect(capture.events).toEqual([{ startMs: 1000, endMs: 1050, midi: 60 }])
  })

  test('starts a press just before beat 1 on beat 1', () => {
    const capture = createCapture()

    capture.press(60, -EARLY_PRESS_TOLERANCE_MS + 10)
    capture.release(60, 300)

    expect(capture.events).toEqual([{ startMs: 0, endMs: 300, midi: 60 }])
  })

  test('ignores a press too early in the count-in, and its release', () => {
    const capture = createCapture()

    expect(capture.press(60, -EARLY_PRESS_TOLERANCE_MS - 10)).toBe(false)
    expect(capture.release(60, 100)).toBe(false)

    expect(capture.events).toEqual([])
    expect(capture.heldMidi()).toBeNull()
  })

  test('drops the older of two keys pressed at the same instant', () => {
    const capture = createCapture()

    capture.press(60, 200)
    capture.press(64, 200)
    capture.release(64, 600)

    expect(capture.events).toEqual([{ startMs: 200, endMs: 600, midi: 64 }])
  })

  test('splits a key pressed again into two notes', () => {
    const capture = createCapture()

    capture.press(60, 0)
    capture.press(60, 500)
    capture.release(60, 900)

    expect(capture.events).toEqual([
      { startMs: 0, endMs: 500, midi: 60 },
      { startMs: 500, endMs: 900, midi: 60 },
    ])
  })

  test('flush ends the held note at the stop time', () => {
    const capture = createCapture()

    capture.press(60, 0)

    expect(capture.flush(800)).toEqual([{ startMs: 0, endMs: 800, midi: 60 }])
    expect(capture.heldMidi()).toBeNull()
  })

  test('flush leaves the notes as they are when no key is held', () => {
    const capture = createCapture()

    capture.press(60, 0)
    capture.release(60, 300)

    expect(capture.flush(800)).toEqual([{ startMs: 0, endMs: 300, midi: 60 }])
  })
})

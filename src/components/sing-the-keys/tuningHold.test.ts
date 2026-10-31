import { describe, expect, test } from 'vitest'
import { createTuningHold, TUNING_HOLD_MS } from './tuningHold'

const FRAME_MS = 16 // ~60 fps

/* Pushes `midi` every frame from startMs for durationMs; returns the end time */
function sing(
  hold: ReturnType<typeof createTuningHold>,
  midi: number | null,
  startMs: number,
  durationMs: number,
): number {
  let timestamp = startMs
  for (; timestamp <= startMs + durationMs; timestamp += FRAME_MS) {
    hold.push(midi, timestamp)
  }

  return timestamp
}

describe('tuningHold', () => {
  test('should finish once a semitone is held for the hold time', () => {
    const hold = createTuningHold()

    sing(hold, 57, 0, TUNING_HOLD_MS - 100)
    expect(hold.heldMidi).toBe(null)
    expect(hold.candidateMidi).toBe(57)
    expect(hold.progress).toBeGreaterThan(0.9)

    sing(hold, 57, TUNING_HOLD_MS - 100 + FRAME_MS, 200)
    expect(hold.heldMidi).toBe(57)
    expect(hold.progress).toBe(1)
  })

  test('should restart the hold when the singer moves to another semitone', () => {
    const hold = createTuningHold()

    const end = sing(hold, 57, 0, 1000)
    sing(hold, 55, end, 500)

    expect(hold.candidateMidi).toBe(55)
    expect(hold.heldMidi).toBe(null)
    expect(hold.progress).toBeLessThan(0.5)
  })

  test('should ride through a short blip on a neighbouring semitone', () => {
    const hold = createTuningHold()

    let end = sing(hold, 57, 0, 800)
    end = sing(hold, 58, end, 60)
    sing(hold, 57, end, 800)

    expect(hold.heldMidi).toBe(57)
  })

  test('should count vibrato within the semitone as one note', () => {
    const hold = createTuningHold()

    for (
      let timestamp = 0;
      timestamp <= TUNING_HOLD_MS + 50;
      timestamp += FRAME_MS
    ) {
      /* ±40 cents at 6 Hz */
      hold.push(
        57 + 0.4 * Math.sin((timestamp / 1000) * 6 * 2 * Math.PI),
        timestamp,
      )
    }

    expect(hold.heldMidi).toBe(57)
  })

  test('should not count a pause towards the hold', () => {
    const hold = createTuningHold()

    hold.push(57, 0)
    hold.push(57, 1400) // one frame after a long gap

    expect(hold.progress).toBe(0)
  })

  test('should keep the candidate through silence without advancing it', () => {
    const hold = createTuningHold()

    const end = sing(hold, 57, 0, 750)
    const progress = hold.progress
    const resumeAt = sing(hold, null, end, 400)

    expect(hold.candidateMidi).toBe(57)
    expect(hold.progress).toBe(progress)

    sing(hold, 57, resumeAt, 800)
    expect(hold.heldMidi).toBe(57)
  })

  test('should ignore frames after it finishes and start over on reset', () => {
    const hold = createTuningHold()

    const end = sing(hold, 57, 0, TUNING_HOLD_MS + 50)
    sing(hold, 50, end, TUNING_HOLD_MS + 50)
    expect(hold.heldMidi).toBe(57)

    hold.reset()
    expect(hold.heldMidi).toBe(null)
    expect(hold.candidateMidi).toBe(null)
    expect(hold.progress).toBe(0)
  })
})

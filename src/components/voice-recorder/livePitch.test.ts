import { describe, expect, test } from 'vitest'

import { createLivePitchReader } from './livePitch'

const WINDOW_SAMPLES = 2048
const SAMPLE_RATE = 48_000
const CLARITY_THRESHOLD = 0.9
/* One animation frame at 60 fps. */
const FRAME_MS = 17

const D_SHARP_3_HZ = 155.56
const A_SHARP_3_HZ = 233.08

function createSine(hz: number): Float32Array {
  const samples = new Float32Array(WINDOW_SAMPLES)

  for (let i = 0; i < WINDOW_SAMPLES; i++) {
    samples[i] = 0.5 * Math.sin((2 * Math.PI * hz * i) / SAMPLE_RATE)
  }

  return samples
}

/* Seeded, so a noise frame can never pass the clarity gate by chance. */
function createNoise(): Float32Array {
  const samples = new Float32Array(WINDOW_SAMPLES)
  let seed = 12345

  for (let i = 0; i < WINDOW_SAMPLES; i++) {
    seed = (seed * 1103515245 + 12345) % 2147483648
    samples[i] = seed / 1073741824 - 1
  }

  return samples
}

function createHarness() {
  const reader = createLivePitchReader(WINDOW_SAMPLES)
  let nowMs = 0

  function readFrames(samples: Float32Array, frameCount: number) {
    let note = null

    for (let frame = 0; frame < frameCount; frame++) {
      note = reader.read(samples, SAMPLE_RATE, CLARITY_THRESHOLD, nowMs)
      nowMs += FRAME_MS
    }

    return note
  }

  return { reader, readFrames }
}

describe('createLivePitchReader', () => {
  test('should wait out the onset before naming a note', () => {
    const { readFrames } = createHarness()

    expect(readFrames(createSine(D_SHARP_3_HZ), 1)).toBeNull()
  })

  test('should name a held note', () => {
    const { readFrames } = createHarness()

    const note = readFrames(createSine(D_SHARP_3_HZ), 10)

    expect(note?.note).toBe('D#')
    expect(note?.octave).toBe(3)
    expect(Math.abs(note?.cents ?? Infinity)).toBeLessThanOrEqual(2)
  })

  test('should report a sharp note with positive cents', () => {
    const { readFrames } = createHarness()
    const twentyCentsSharpHz = D_SHARP_3_HZ * 2 ** (20 / 1200)

    const note = readFrames(createSine(twentyCentsSharpHz), 10)

    expect(note?.note).toBe('D#')
    expect(note?.cents).toBeGreaterThanOrEqual(18)
    expect(note?.cents).toBeLessThanOrEqual(22)
  })

  test.each([
    { name: 'silence', samples: new Float32Array(WINDOW_SAMPLES) },
    { name: 'noise', samples: createNoise() },
  ])('should report no note for $name', ({ samples }) => {
    const { readFrames } = createHarness()

    expect(readFrames(samples, 10)).toBeNull()
  })

  test('should drop the note when the singer stops', () => {
    const { readFrames } = createHarness()

    readFrames(createSine(D_SHARP_3_HZ), 10)

    expect(readFrames(new Float32Array(WINDOW_SAMPLES), 1)).toBeNull()
  })

  test('should hold the note through a one-frame spike', () => {
    const { readFrames } = createHarness()

    readFrames(createSine(D_SHARP_3_HZ), 10)

    expect(readFrames(createSine(A_SHARP_3_HZ), 1)?.note).toBe('D#')
    expect(readFrames(createSine(D_SHARP_3_HZ), 1)?.note).toBe('D#')
  })

  test('should follow a real jump once it holds', () => {
    const { readFrames } = createHarness()

    readFrames(createSine(D_SHARP_3_HZ), 10)

    expect(readFrames(createSine(A_SHARP_3_HZ), 10)?.note).toBe('A#')
  })

  test('should forget the last note on reset', () => {
    const { reader, readFrames } = createHarness()

    readFrames(createSine(D_SHARP_3_HZ), 10)
    reader.reset()

    expect(readFrames(createSine(A_SHARP_3_HZ), 1)).toBeNull()
  })
})

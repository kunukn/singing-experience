import { describe, expect, test } from 'vitest'

import { findSoundSpan, trimSilence } from './trimSilence'

/* Low, so the sample counts below stay readable: 1 sample per ms. */
const SAMPLE_RATE = 1000

function buildTake(parts: { ms: number; amplitude: number }[]) {
  const samples: number[] = []
  for (const { ms, amplitude } of parts) {
    for (let i = 0; i < ms; i++) {
      samples.push(amplitude * Math.sin((2 * Math.PI * 100 * i) / SAMPLE_RATE))
    }
  }

  return Float32Array.from(samples)
}

const quiet = (ms: number) => ({ ms, amplitude: 0.001 })
const sung = (ms: number) => ({ ms, amplitude: 0.5 })

describe('trimSilence', () => {
  test('finds the singing with a lead-in before and a tail after', () => {
    const take = buildTake([quiet(2000), sung(1000), quiet(2000)])

    expect(findSoundSpan(take, SAMPLE_RATE)).toEqual({
      startSample: 2000 - 150,
      endSample: 3000 + 250,
    })
  })

  test('ignores a short tap before the singing', () => {
    const take = buildTake([quiet(500), sung(30), quiet(1500), sung(1000)])

    expect(findSoundSpan(take, SAMPLE_RATE)?.startSample).toBe(2030 - 150)
  })

  test('stops the padding at the edges of the take', () => {
    const take = buildTake([quiet(50), sung(1000), quiet(100)])

    expect(findSoundSpan(take, SAMPLE_RATE)).toEqual({
      startSample: 0,
      endSample: take.length,
    })
  })

  test('returns null when nothing rises above the room', () => {
    expect(findSoundSpan(buildTake([quiet(3000)]), SAMPLE_RATE)).toBeNull()
  })

  test('keeps a take with no clear sound whole', () => {
    const take = buildTake([quiet(3000)])

    expect(trimSilence(take, SAMPLE_RATE)).toHaveLength(take.length)
  })

  test('fades both ends to zero so the cuts do not click', () => {
    const trimmed = trimSilence(
      buildTake([quiet(1000), sung(1000), quiet(1000)]),
      SAMPLE_RATE,
    )

    expect(trimmed).toHaveLength(1400)
    expect(trimmed[0]).toBeCloseTo(0, 6)
    expect(trimmed.at(-1)).toBeCloseTo(0, 6)
  })

  test('leaves the original samples untouched', () => {
    const take = buildTake([quiet(1000), sung(1000), quiet(1000)])
    const original = take.slice()

    trimSilence(take, SAMPLE_RATE)

    expect(take).toEqual(original)
  })
})

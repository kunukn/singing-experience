import { describe, expect, test } from 'vitest'

import type { PitchTrack } from './pitchTrack'
import type { TakeNote } from './takeNotes'
import { buildTakeRating, MIN_RATED_VOICED_MS } from './takeRating'

const C_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72]

const track: PitchTrack = {
  hopMs: 10,
  windowMs: 40,
  frameCount: 1,
  hz: new Float32Array([261.63]),
  clarity: new Float32Array([0.95]),
  rmsDb: new Float32Array([-20]),
}

/* Eight held, centred notes in key: only drift can lower the key score. */
const notes: TakeNote[] = C_MAJOR.map((midi, index) => ({
  midi,
  startMs: index * 1000,
  endMs: index * 1000 + 900,
  centerMidi: midi,
  centsFromGrid: 0,
  isGlide: false,
  hasSlideIn: false,
  hasCleanStart: true,
  wobbleCents: 3,
  vibrato: null,
}))

function rate(voicedMs: number, driftCents: number) {
  return buildTakeRating({
    track,
    notes,
    voicedMs,
    driftCents,
    inScaleShare: 1,
  })
}

describe('buildTakeRating - minimum singing time', () => {
  test('gives no rating below 10 seconds of clear singing', () => {
    expect(MIN_RATED_VOICED_MS).toBe(10_000)
    expect(rate(9_999, 0)).toBeNull()
  })

  test('rates from 10 seconds of clear singing', () => {
    expect(rate(10_000, 0)).not.toBeNull()
  })
})

describe('buildTakeRating - drift penalty', () => {
  test.each([10_000, 15_000])(
    'ignores drift after %i ms, too short to measure it',
    (voicedMs) => {
      expect(rate(voicedMs, 50)!.stayInKey).toBe(1)
    },
  )

  test('applies half the penalty halfway through the phase-in', () => {
    expect(rate(22_500, 50)!.stayInKey).toBeCloseTo(0.75)
  })

  test.each([30_000, 60_000])(
    'applies the full penalty from 30 seconds (%i ms)',
    (voicedMs) => {
      expect(rate(voicedMs, 50)!.stayInKey).toBeCloseTo(0.5)
    },
  )

  test('never drops the score sharply as the take gets longer', () => {
    let previous = rate(10_000, 50)!.overall

    for (let voicedMs = 10_500; voicedMs <= 30_000; voicedMs += 500) {
      const overall = rate(voicedMs, 50)!.overall
      expect(previous - overall).toBeLessThan(0.01)
      previous = overall
    }
  })
})

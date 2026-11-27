import { describe, expect, test } from 'vitest'

import { midiToFrequency } from '@/utils/noteUtils'

import {
  ANALYSIS_SAMPLE_RATE,
  createPitchTrack,
  frameTimeMs,
} from './pitchTrack'
import type { TakeNote } from './takeNotes'
import { buildTakeRating, MIN_RATED_VOICED_MS } from './takeRating'

const C_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72]
/* A clear, comfortably loud voice in every frame. */
const SUNG_CLARITY = 0.95
const SUNG_DB = -20

/*
 * A take that is clear singing from start to end: eight held, centred notes in
 * key, sung back to back and sharing the time equally. Only drift can lower the
 * key score.
 */
function createTake(voicedMs: number) {
  const noteMs = voicedMs / C_MAJOR.length
  const notes: TakeNote[] = C_MAJOR.map((midi, index) => ({
    midi,
    startMs: index * noteMs,
    endMs: (index + 1) * noteMs,
    centerMidi: midi,
    centsFromGrid: 0,
    isGlide: false,
    hasSlideIn: false,
    hasCleanStart: true,
    wobbleCents: 3,
    vibrato: null,
  }))

  const track = createPitchTrack({
    samples: new Float32Array(
      Math.ceil((voicedMs / 1000) * ANALYSIS_SAMPLE_RATE),
    ),
    sampleRate: ANALYSIS_SAMPLE_RATE,
  })
  for (let frame = 0; frame < track.frameCount; frame++) {
    const noteIndex = Math.min(
      notes.length - 1,
      Math.floor(frameTimeMs(track, frame) / noteMs),
    )
    track.hz[frame] = midiToFrequency(notes[noteIndex].midi)
    track.clarity[frame] = SUNG_CLARITY
    track.rmsDb[frame] = SUNG_DB
  }

  return { track, notes }
}

function rate(voicedMs: number, driftCents: number) {
  return buildTakeRating({
    ...createTake(voicedMs),
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

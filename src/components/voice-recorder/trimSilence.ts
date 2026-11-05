import { findSoundGateDb } from './soundGate'

/* Fine enough to place a cut, coarse enough to scan a minute quickly. */
const FRAME_MS = 10
/* Sound must last this long to count, so a tap on the screen doesn't. */
const MIN_SOUND_MS = 80
/* Kept before the first sound: a breath or a soft "s" sits just under the gate. */
const LEAD_IN_MS = 150
/* Kept after the last sound for the note's natural fade and the room's echo. */
const TAIL_MS = 250
/* Too short to hear as a fade, long enough to stop a click at the cut. */
const FADE_MS = 10
/* Below any mic's noise floor; keeps frame levels finite for the percentiles. */
const DIGITAL_SILENCE_DB = -180

export type SoundSpan = { startSample: number; endSample: number }

function measureFrameLevelsDb(samples: Float32Array, frameSamples: number) {
  const frameCount = Math.floor(samples.length / frameSamples)
  const levelsDb = new Float32Array(frameCount)

  for (let frame = 0; frame < frameCount; frame++) {
    let energy = 0
    const offset = frame * frameSamples
    for (let i = 0; i < frameSamples; i++) {
      energy += samples[offset + i] ** 2
    }

    const rms = Math.sqrt(energy / frameSamples)
    levelsDb[frame] =
      rms > 0
        ? Math.max(20 * Math.log10(rms), DIGITAL_SILENCE_DB)
        : DIGITAL_SILENCE_DB
  }

  return levelsDb
}

/* Scanning in `direction`, the outer frame of the first run of `runFrames`
 * loud frames: its first frame going forward, its last going backward. */
function findRunEdge(
  isLoud: (frame: number) => boolean,
  frameCount: number,
  runFrames: number,
  direction: 1 | -1,
): number {
  let runLength = 0
  for (let step = 0; step < frameCount; step++) {
    const frame = direction === 1 ? step : frameCount - 1 - step
    runLength = isLoud(frame) ? runLength + 1 : 0
    if (runLength === runFrames) return frame - direction * (runFrames - 1)
  }

  return -1
}

/* Where the singing starts and ends, padded; null when nothing sounds. */
export function findSoundSpan(
  samples: Float32Array,
  sampleRate: number,
): SoundSpan | null {
  const frameSamples = Math.round((sampleRate * FRAME_MS) / 1000)
  const levelsDb = measureFrameLevelsDb(samples, frameSamples)
  const gateDb = findSoundGateDb(levelsDb)
  const runFrames = Math.ceil(MIN_SOUND_MS / FRAME_MS)
  const isLoud = (frame: number) => levelsDb[frame] >= gateDb

  const firstFrame = findRunEdge(isLoud, levelsDb.length, runFrames, 1)
  if (firstFrame === -1) return null

  const lastFrame = findRunEdge(isLoud, levelsDb.length, runFrames, -1)
  const msToSamples = (ms: number) => Math.round((sampleRate * ms) / 1000)

  return {
    startSample: Math.max(
      0,
      firstFrame * frameSamples - msToSamples(LEAD_IN_MS),
    ),
    endSample: Math.min(
      samples.length,
      (lastFrame + 1) * frameSamples + msToSamples(TAIL_MS),
    ),
  }
}

/*
 * Cuts the quiet before the first and after the last sung sound, which also
 * drops the taps on Record and Stop. A take with no clear sound is kept whole,
 * so analysis can still say it was too quiet.
 */
export function trimSilence(
  samples: Float32Array,
  sampleRate: number,
): Float32Array {
  const span = findSoundSpan(samples, sampleRate)
  const trimmed = span
    ? samples.slice(span.startSample, span.endSample)
    : samples.slice()

  const fadeSamples = Math.min(
    Math.round((sampleRate * FADE_MS) / 1000),
    Math.floor(trimmed.length / 2),
  )
  for (let i = 0; i < fadeSamples; i++) {
    const gain = i / fadeSamples
    trimmed[i] *= gain
    trimmed[trimmed.length - 1 - i] *= gain
  }

  return trimmed
}

import { PitchDetector } from 'pitchy'

/* Decoded mono audio, the input to all analysis. */
export type TakeSource = { samples: Float32Array; sampleRate: number }

/* Pitch stays accurate up to the voice's 1500 Hz ceiling at this rate, and it
 * keeps a 5-minute take to about 26 MB during analysis. */
export const ANALYSIS_SAMPLE_RATE = 22050
/* 46 ms at 22.05 kHz: holds two full periods of the lowest detectable pitch. */
const WINDOW_SAMPLES = 1024
/* 20 ms at 22.05 kHz: 50 frames a second, enough to resolve 8 Hz vibrato. */
const HOP_SAMPLES = 441
/* Below this a frame is digital silence and has no pitch worth computing. */
const SILENCE_DB = -90

export type PitchTrack = {
  hopMs: number
  windowMs: number
  frameCount: number
  hz: Float32Array
  clarity: Float32Array
  rmsDb: Float32Array
}

/* A frame describes the middle of its window, not the start. */
export function frameTimeMs(track: PitchTrack, frameIndex: number): number {
  return frameIndex * track.hopMs + track.windowMs / 2
}

export function frameIndexAt(track: PitchTrack, timeMs: number): number {
  return Math.round((timeMs - track.windowMs / 2) / track.hopMs)
}

export function createPitchTrack({
  samples,
  sampleRate,
}: TakeSource): PitchTrack {
  const frameCount =
    samples.length < WINDOW_SAMPLES
      ? 0
      : Math.floor((samples.length - WINDOW_SAMPLES) / HOP_SAMPLES) + 1

  return {
    hopMs: (HOP_SAMPLES / sampleRate) * 1000,
    windowMs: (WINDOW_SAMPLES / sampleRate) * 1000,
    frameCount,
    hz: new Float32Array(frameCount),
    clarity: new Float32Array(frameCount),
    rmsDb: new Float32Array(frameCount),
  }
}

/* Returns a function that fills frames [from, to), so the caller can pause
 * between batches and keep the page responsive. */
export function createFrameTracker(
  { samples, sampleRate }: TakeSource,
  track: PitchTrack,
) {
  const detector = PitchDetector.forFloat32Array(WINDOW_SAMPLES)

  return function trackFrames(from: number, to: number) {
    for (let frame = from; frame < to; frame++) {
      const start = frame * HOP_SAMPLES
      const window = samples.subarray(start, start + WINDOW_SAMPLES)

      let energy = 0
      for (let i = 0; i < window.length; i++) energy += window[i] * window[i]

      const rms = Math.sqrt(energy / window.length)
      const rmsDb = rms > 0 ? 20 * Math.log10(rms) : -Infinity
      track.rmsDb[frame] = Math.max(rmsDb, SILENCE_DB * 2)

      if (rmsDb < SILENCE_DB) continue

      const [hz, clarity] = detector.findPitch(window, sampleRate)
      if (Number.isFinite(hz) && Number.isFinite(clarity)) {
        track.hz[frame] = hz
        track.clarity[frame] = clarity
      }
    }
  }
}

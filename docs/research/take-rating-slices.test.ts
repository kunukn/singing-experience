// @vitest-environment node
/*
 * Research tool, not a regression test: skipped unless WAV is set.
 *
 * Scores a recorded take whole, then scores every slice holding N seconds of
 * clear singing as if it were its own take. The spread across slices shows how
 * much a rating of that length depends on luck. Context and results:
 * take-rating-minimum-length-2026-11-07.md.
 *
 *   WAV=.temp/take.wav npx vitest run docs/research/take-rating-slices.test.ts --silent=false
 *
 * Expects 16-bit PCM WAV, as the voice recorder downloads.
 */
import { readFileSync } from 'node:fs'
import { test } from 'vitest'

import {
  analyzeTake,
  commonScaleCoverage,
  type TakeAnalysis,
} from '@/components/voice-recorder/analyzeTake'
import {
  ANALYSIS_SAMPLE_RATE,
  frameTimeMs,
} from '@/components/voice-recorder/pitchTrack'
import {
  buildTakeRating,
  MIN_RATED_VOICED_MS,
} from '@/components/voice-recorder/takeRating'
import { pitchClassOf } from '@/utils/scaleHighlight'

const WAV_PATH = process.env.WAV
const TARGET_SECONDS = [6, 8, 10, 12, 15, 20]
/* A new slice starts this often; neighbouring slices overlap heavily. */
const STEP_MS = 500
/* Keeps the release of the last note inside the slice. */
const TAIL_MS = 150

function readWav(path: string) {
  const buffer = readFileSync(path)
  const channels = buffer.readUInt16LE(22)
  const sampleRate = buffer.readUInt32LE(24)
  const bits = buffer.readUInt16LE(34)
  if (bits !== 16) throw new Error(`Expected 16-bit PCM, got ${bits}-bit`)

  let offset = 12
  while (buffer.toString('ascii', offset, offset + 4) !== 'data') {
    offset += 8 + buffer.readUInt32LE(offset + 4)
  }
  const start = offset + 8
  const frames = Math.floor(buffer.readUInt32LE(offset + 4) / 2 / channels)
  const samples = new Float32Array(frames)
  for (let i = 0; i < frames; i++) {
    let sum = 0
    for (let channel = 0; channel < channels; channel++) {
      sum += buffer.readInt16LE(start + (i * channels + channel) * 2) / 32768
    }
    samples[i] = sum / channels
  }

  return { samples, sampleRate }
}

/* Windowed sinc, like the browser's decoder, so harmonics above the new
 * Nyquist don't fold back and confuse the pitch tracker. */
function resample(input: Float32Array, from: number, to: number) {
  const ratio = from / to
  const cutoff = Math.min(1, to / from) * 0.95
  const halfWidth = 16
  const output = new Float32Array(Math.floor(input.length / ratio))
  for (let i = 0; i < output.length; i++) {
    const center = i * ratio
    let sum = 0
    let weightSum = 0
    for (
      let j = Math.ceil(center - halfWidth / cutoff);
      j <= Math.floor(center + halfWidth / cutoff);
      j++
    ) {
      if (j < 0 || j >= input.length) continue
      const x = (j - center) * cutoff
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
      const weight = sinc * (0.5 + 0.5 * Math.cos((Math.PI * x) / halfWidth))
      sum += input[j] * weight
      weightSum += weight
    }
    output[i] = sum / weightSum
  }

  return output
}

/* Same as analyzeTake's private helper. */
function inScaleShare({ notes, key }: TakeAnalysis) {
  if (!key) return commonScaleCoverage(notes)

  let insideMs = 0
  let totalMs = 0
  for (const note of notes) {
    const durationMs = note.endMs - note.startMs
    totalMs += durationMs
    if (key.pitchClasses.has(pitchClassOf(note.midi))) insideMs += durationMs
  }

  return totalMs > 0 ? insideMs / totalMs : 0
}

/* The real formula with only the minimum-time gate lifted, so short slices can
 * be compared. The drift phase-in starts above the gate, so it's unaffected. */
function rateWithoutGate(analysis: TakeAnalysis) {
  return buildTakeRating({
    track: analysis.track,
    notes: analysis.notes,
    voicedMs: Math.max(analysis.quality.voicedMs, MIN_RATED_VOICED_MS),
    driftCents: analysis.tuning.driftCents,
    inScaleShare: inScaleShare(analysis),
  })
}

function summarise(values: number[]) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length

  return {
    mean,
    sd: Math.sqrt(variance),
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

const format = (value: number | null | undefined) =>
  value === null || value === undefined ? '-' : value.toFixed(2)

test.skipIf(!WAV_PATH)(
  'take rating by slice length',
  { timeout: 600_000 },
  async () => {
    const wav = readWav(WAV_PATH!)
    const samples = resample(wav.samples, wav.sampleRate, ANALYSIS_SAMPLE_RATE)

    const whole = await analyzeTake({
      samples,
      sampleRate: ANALYSIS_SAMPLE_RATE,
    })
    const wholeRating = rateWithoutGate(whole)
    console.log(
      `Whole take: ${(whole.durationMs / 1000).toFixed(1)} s, clear singing ${(whole.quality.voicedMs / 1000).toFixed(1)} s, ${whole.notes.length} notes, drift ${whole.tuning.driftCents.toFixed(0)}¢`,
    )
    console.log(
      `  overall ${format(wholeRating?.overall)} (${wholeRating?.level}), centring ${format(wholeRating?.centring)}, steadiness ${format(wholeRating?.steadiness)}, key ${format(wholeRating?.stayInKey)}`,
    )

    /* Where each voiced frame of the whole take sits, to place slice ends. */
    const voicedTimesMs: number[] = []
    for (let frame = 0; frame < whole.track.frameCount; frame++) {
      if (!Number.isNaN(whole.tunedMidi[frame])) {
        voicedTimesMs.push(frameTimeMs(whole.track, frame))
      }
    }

    for (const seconds of TARGET_SECONDS) {
      const framesNeeded = Math.round((seconds * 1000) / whole.track.hopMs)
      const overall: number[] = []
      const centring: number[] = []
      const key: number[] = []
      const drift: number[] = []
      let unrated = 0

      for (let startMs = 0; ; startMs += STEP_MS) {
        const first = voicedTimesMs.findIndex((timeMs) => timeMs >= startMs)
        const last = first + framesNeeded - 1
        if (first < 0 || last >= voicedTimesMs.length) break

        const from = Math.floor((startMs / 1000) * ANALYSIS_SAMPLE_RATE)
        const to = Math.ceil(
          ((voicedTimesMs[last] + TAIL_MS) / 1000) * ANALYSIS_SAMPLE_RATE,
        )
        const slice = await analyzeTake({
          samples: samples.slice(from, Math.min(to, samples.length)),
          sampleRate: ANALYSIS_SAMPLE_RATE,
        })
        const rating = rateWithoutGate(slice)
        if (!rating) {
          unrated++
          continue
        }
        overall.push(rating.overall)
        centring.push(rating.centring)
        key.push(rating.stayInKey)
        drift.push(Math.abs(slice.tuning.driftCents))
      }

      if (overall.length === 0) {
        console.log(`${seconds} s: not enough clear singing for one slice`)
        continue
      }
      const o = summarise(overall)
      console.log(
        [
          `${String(seconds).padStart(2)} s: ${overall.length} slices (${unrated} unrated)`,
          `overall ${format(o.mean)} ±${format(o.sd)} [${format(o.min)}–${format(o.max)}]`,
          `vs whole ${(o.mean - (wholeRating?.overall ?? 0)).toFixed(2)}`,
          `sd centring ${format(summarise(centring).sd)} key ${format(summarise(key).sd)}`,
          `drift mean ${summarise(drift).mean.toFixed(0)}¢ max ${summarise(drift).max.toFixed(0)}¢`,
        ].join(' | '),
      )
    }
  },
)

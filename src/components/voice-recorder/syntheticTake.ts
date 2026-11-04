import { midiToFrequency } from '@/utils/noteUtils'

import { ANALYSIS_SAMPLE_RATE, type TakeSource } from './pitchTrack'

/*
 * Made-up singing with known answers. Drives the analysis tests and the
 * /voice-recorder-test page, so neither needs a microphone.
 */

type Tone = {
  midi: number
  durationMs: number
  gapMs?: number
  /* Constant offset from the note, as a singer sitting sharp or flat would. */
  cents?: number
  /* Cents per second, measured from the start of the take. */
  driftPerSecond?: number
  gain?: number
  vibrato?: { rateHz: number; depthCents: number }
  /* Slides from this note to `midi` over the first part of the tone. */
  glideFromMidi?: number
  /* Brief detector-fooling jump up an octave, partway through. */
  octaveGlitchAtMs?: number
}

export const SYNTHETIC_PRESET_NAMES = [
  'steadyScale',
  'flatTuning',
  'vibrato',
  'wideVibratoOffCenter',
  'drift',
  'monotone',
  'heldVibratoNote',
  'staccato',
  'offKey',
  'octaveGlitches',
  'portamento',
  'dramaticBallad',
  'speechLike',
  'backingChord',
  'silence',
  'clipped',
  'tooQuiet',
  'tooShort',
] as const

export type SyntheticPresetName = (typeof SYNTHETIC_PRESET_NAMES)[number]

/* Enough harmonics to look like a voice to the pitch tracker, not a pure sine. */
const HARMONIC_LEVELS = [1, 0.5, 0.3, 0.15, 0.08]
const HARMONIC_TOTAL = HARMONIC_LEVELS.reduce((sum, level) => sum + level, 0)
const ATTACK_RELEASE_MS = 15
const OCTAVE_GLITCH_MS = 60
const GLIDE_MS = 250
const DEFAULT_GAIN = 0.4
/* Quiet room hiss, about -60 dBFS, so "silence" isn't digital zero. */
const ROOM_NOISE = 0.001

/* C major up and back, C4 to C5. */
const C_MAJOR = [60, 62, 64, 65, 67, 69, 71, 72, 71, 69, 67, 65, 64, 62]

/* Small deterministic generator, so a preset renders the same every time. */
function createRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

function repeatMelody(count: number, tone: (midi: number) => Tone): Tone[] {
  return Array.from({ length: count }, (_, index) =>
    tone(C_MAJOR[index % C_MAJOR.length]),
  )
}

function renderTones(tones: Tone[], seed: number): Float32Array {
  const random = createRandom(seed)
  const totalMs = tones.reduce(
    (sum, tone) => sum + tone.durationMs + (tone.gapMs ?? 0),
    0,
  )
  const output = new Float32Array(
    Math.ceil((totalMs / 1000) * ANALYSIS_SAMPLE_RATE),
  )
  let startSample = 0

  for (const tone of tones) {
    const toneSamples = Math.round(
      (tone.durationMs / 1000) * ANALYSIS_SAMPLE_RATE,
    )
    const fadeSamples = (ATTACK_RELEASE_MS / 1000) * ANALYSIS_SAMPLE_RATE
    const gain = tone.gain ?? DEFAULT_GAIN
    let phase = random() * 2 * Math.PI

    for (let i = 0; i < toneSamples; i++) {
      const toneMs = (i / ANALYSIS_SAMPLE_RATE) * 1000
      const takeSeconds = (startSample + i) / ANALYSIS_SAMPLE_RATE

      let midi = tone.midi
      if (tone.glideFromMidi !== undefined && toneMs < GLIDE_MS) {
        midi =
          tone.glideFromMidi +
          (tone.midi - tone.glideFromMidi) * (toneMs / GLIDE_MS)
      }

      let cents = (tone.cents ?? 0) + (tone.driftPerSecond ?? 0) * takeSeconds
      if (tone.vibrato) {
        cents +=
          tone.vibrato.depthCents *
          Math.sin(2 * Math.PI * tone.vibrato.rateHz * (toneMs / 1000))
      }

      const isGlitching =
        tone.octaveGlitchAtMs !== undefined &&
        toneMs >= tone.octaveGlitchAtMs &&
        toneMs < tone.octaveGlitchAtMs + OCTAVE_GLITCH_MS
      if (isGlitching) midi += 12

      const hz = midiToFrequency(midi) * 2 ** (cents / 1200)
      phase += (2 * Math.PI * hz) / ANALYSIS_SAMPLE_RATE

      let sample = 0
      for (let harmonic = 0; harmonic < HARMONIC_LEVELS.length; harmonic++) {
        sample += HARMONIC_LEVELS[harmonic] * Math.sin(phase * (harmonic + 1))
      }

      const envelope = Math.min(
        1,
        i / fadeSamples,
        (toneSamples - i) / fadeSamples,
      )
      output[startSample + i] += (sample / HARMONIC_TOTAL) * gain * envelope
    }

    startSample +=
      toneSamples +
      Math.round(((tone.gapMs ?? 0) / 1000) * ANALYSIS_SAMPLE_RATE)
  }

  addRoomNoise(output, random)

  return output
}

function addRoomNoise(samples: Float32Array, random: () => number) {
  for (let i = 0; i < samples.length; i++) {
    samples[i] += (random() * 2 - 1) * ROOM_NOISE
  }
}

/* Unpitched bursts with a syllable rhythm and a short voiced core, like speech. */
function renderSpeechLike(seed: number): Float32Array {
  const random = createRandom(seed)
  const seconds = 24
  const output = new Float32Array(seconds * ANALYSIS_SAMPLE_RATE)
  const syllableSamples = Math.round(0.22 * ANALYSIS_SAMPLE_RATE)
  let phase = 0

  for (let start = 0; start + syllableSamples < output.length;) {
    const voicedShare = 0.3 + random() * 0.2
    let hz = 110 + random() * 40

    for (let i = 0; i < syllableSamples; i++) {
      const position = i / syllableSamples
      const envelope = Math.sin(Math.PI * position) * 0.35
      /* Speech pitch never holds still: it slides through each syllable. */
      hz *= 1 - 0.0002
      phase += (2 * Math.PI * hz) / ANALYSIS_SAMPLE_RATE
      output[start + i] =
        position < voicedShare
          ? (Math.sin(phase) + 0.4 * Math.sin(phase * 2)) * envelope * 0.6
          : (random() * 2 - 1) * envelope
    }

    start +=
      syllableSamples + Math.round(random() * 0.05 * ANALYSIS_SAMPLE_RATE)
  }

  addRoomNoise(output, random)

  return output
}

const SEED = 20_261_104

function buildSamples(name: SyntheticPresetName): Float32Array {
  const random = createRandom(SEED)
  const plainTone = (midi: number): Tone => ({
    midi,
    durationMs: 700,
    gapMs: 80,
  })

  switch (name) {
    case 'steadyScale':
      return renderTones(repeatMelody(28, plainTone), SEED)
    case 'flatTuning':
      return renderTones(
        repeatMelody(28, (midi) => ({ ...plainTone(midi), cents: -35 })),
        SEED,
      )
    case 'vibrato':
      return renderTones(
        repeatMelody(14, (midi) => ({
          midi,
          durationMs: 1400,
          gapMs: 100,
          vibrato: { rateHz: 5.5, depthCents: 50 },
        })),
        SEED,
      )
    case 'wideVibratoOffCenter':
      return renderTones(
        repeatMelody(14, (midi) => ({
          midi,
          durationMs: 1400,
          gapMs: 100,
          cents: 25,
          vibrato: { rateHz: 5.5, depthCents: 45 },
        })),
        SEED,
      )
    case 'drift':
      return renderTones(
        repeatMelody(60, (midi) => ({
          midi,
          durationMs: 700,
          gapMs: 50,
          driftPerSecond: -1,
        })),
        SEED,
      )
    case 'monotone':
      return renderTones(
        Array.from({ length: 30 }, () => ({
          midi: 60,
          durationMs: 600,
          gapMs: 120,
        })),
        SEED,
      )
    case 'heldVibratoNote':
      return renderTones(
        [
          {
            midi: 69,
            durationMs: 17_000,
            vibrato: { rateHz: 5.5, depthCents: 40 },
          },
        ],
        SEED,
      )
    case 'staccato':
      return renderTones(
        repeatMelody(100, (midi) => ({ midi, durationMs: 120, gapMs: 80 })),
        SEED,
      )
    case 'offKey':
      return renderTones(
        repeatMelody(40, (midi) => ({
          ...plainTone(midi),
          cents: (random() * 2 - 1) * 50,
        })),
        SEED,
      )
    case 'octaveGlitches':
      return renderTones(
        repeatMelody(28, (midi) => ({
          ...plainTone(midi),
          octaveGlitchAtMs: 300,
        })),
        SEED,
      )
    case 'portamento':
      return renderTones(
        repeatMelody(28, (midi) => ({
          ...plainTone(midi),
          glideFromMidi: midi - 2,
        })),
        SEED,
      )
    case 'dramaticBallad':
      return renderTones(
        [55, 57, 60, 64, 67, 72, 76, 79, 76, 72, 67, 64, 60, 57].flatMap(
          (midi, index) => [
            {
              midi,
              durationMs: 1500,
              gapMs: 150,
              /* Whisper to belt and back: about a 30 dB swing. */
              gain: index % 7 < 4 ? 0.03 : 0.7,
              vibrato: { rateHz: 5.5, depthCents: 35 },
            },
          ],
        ),
        SEED,
      )
    case 'speechLike':
      return renderSpeechLike(SEED)
    case 'backingChord': {
      const voice = renderTones(repeatMelody(28, plainTone), SEED)
      const voiceMs = (voice.length / ANALYSIS_SAMPLE_RATE) * 1000

      /* renderTones plays tones one after another, so layer the chord by hand. */
      for (const midi of [48, 52, 55]) {
        const chordNote = renderTones(
          [{ midi, durationMs: voiceMs, gain: 0.35 }],
          SEED + midi,
        )
        for (let i = 0; i < voice.length; i++) voice[i] += chordNote[i] ?? 0
      }

      return voice
    }
    case 'silence': {
      const samples = new Float32Array(10 * ANALYSIS_SAMPLE_RATE)
      addRoomNoise(samples, random)

      return samples
    }
    case 'clipped':
      return renderTones(
        repeatMelody(28, (midi) => ({ ...plainTone(midi), gain: 3 })),
        SEED,
      ).map((sample) => Math.max(-1, Math.min(1, sample)))
    case 'tooQuiet':
      return renderTones(
        repeatMelody(28, (midi) => ({ ...plainTone(midi), gain: 0.004 })),
        SEED,
      )
    case 'tooShort':
      return renderTones(repeatMelody(3, plainTone), SEED)
  }
}

export function createSyntheticTake(name: SyntheticPresetName): TakeSource {
  return { samples: buildSamples(name), sampleRate: ANALYSIS_SAMPLE_RATE }
}

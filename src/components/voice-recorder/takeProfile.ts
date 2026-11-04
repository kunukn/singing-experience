import { CLOSE_CENTS } from '@/utils/pitchColors'

import { frameTimeMs, type PitchTrack } from './pitchTrack'
import type { TakeNote } from './takeNotes'
import { clamp01, mean, median, percentile, ramp } from './takeStats'

/*
 * Starting anchors, set by reasoning and synthetic takes. They still need
 * calibrating against real singing, so expect these numbers to move.
 */
const FAST_ONSETS_PER_SECOND = { low: 1, high: 5 }
const LEAPING_RANGE_SEMITONES = { low: 3, high: 19 }
const LEAPING_INTERVAL_SEMITONES = { low: 0.5, high: 4 }
const CHOPPY_HELD_SHARE = { low: 0.95, high: 0.5 }
const RHYTHMIC_CORRELATION = { low: 0.2, high: 0.6 }
const SPOKEN_VOICED_SHARE = { low: 0.8, high: 0.35 }
const DRAMATIC_SPREAD_DB = { low: 8, high: 24 }
const COLOURFUL_OUTSIDE_SHARE = { low: 0, high: 0.3 }

/* A rise this big, this quickly, is a new syllable or note attack. */
const ONSET_RISE_DB = 6
const ONSET_RISE_FRAMES = 3 // 60 ms at 20 ms a frame
const ONSET_MIN_SPACING_MS = 100

/* A pause shorter than this is a breath inside one phrase. */
const PHRASE_GAP_MS = 500

/* Beat lags from 240 BPM down to 40 BPM. */
const PULSE_MIN_LAG_MS = 250
const PULSE_MAX_LAG_MS = 1500
const PULSE_MIN_ONSETS = 8

/* Off-key singing also lands outside common scales, so Colourful only counts
 * when most notes are well centred. */
const COLOURFUL_MIN_CENTRED_SHARE = 0.6

const MAX_WORDS = 3

export type ProfileAxisKey =
  | 'tempo'
  | 'leaping'
  | 'choppy'
  | 'rhythmic'
  | 'spoken'
  | 'dramatic'
  | 'colourful'

export type ProfileWordKey =
  | 'melodic'
  | 'monotonic'
  | 'fast'
  | 'slow'
  | 'rhythmic'
  | 'dramatic'
  | 'energetic'
  | 'rapLike'
  | 'romantic'
  | 'exotic'

export type ProfileAxis = {
  key: ProfileAxisKey
  /* 0 is the left-hand label, 1 the right-hand one. */
  value: number
}

export type TakeProfile = {
  axes: ProfileAxis[]
  /* Strongest first, at most MAX_WORDS. */
  words: ProfileWordKey[]
  onsetsPerSecond: number
  voicedShare: number
  medianPhraseMs: number
  vibratoShare: number
  rangeLowMidi: number
  rangeHighMidi: number
}

type ProfileInput = {
  track: PitchTrack
  tunedMidi: Float32Array
  soundGateDb: number
  notes: TakeNote[]
  activeMs: number
  voicedMs: number
  commonScaleCoverage: number
  hasAutoGain: boolean
}

/* Note starts plus sudden loudness rises, which catch consonants and spoken
 * syllables that never become a note. */
function findOnsetsMs(
  track: PitchTrack,
  notes: TakeNote[],
  soundGateDb: number,
): number[] {
  const candidates = notes.map((note) => note.startMs)

  for (let frame = ONSET_RISE_FRAMES; frame < track.frameCount; frame++) {
    const rise = track.rmsDb[frame] - track.rmsDb[frame - ONSET_RISE_FRAMES]
    if (rise >= ONSET_RISE_DB && track.rmsDb[frame] >= soundGateDb) {
      candidates.push(frameTimeMs(track, frame))
    }
  }

  const onsets: number[] = []
  for (const timeMs of candidates.toSorted((a, b) => a - b)) {
    const previous = onsets[onsets.length - 1]
    if (previous === undefined || timeMs - previous >= ONSET_MIN_SPACING_MS) {
      onsets.push(timeMs)
    }
  }

  return onsets
}

/* How strongly note starts repeat at one steady beat, 0 to 1. */
function measurePulse(onsetsMs: number[], track: PitchTrack): number {
  if (onsetsMs.length < PULSE_MIN_ONSETS) return 0

  const envelope = new Float32Array(track.frameCount)
  for (const timeMs of onsetsMs) {
    const frame = Math.round(timeMs / track.hopMs)
    /* Three frames wide, so slightly uneven human timing still lines up. */
    for (let i = frame - 1; i <= frame + 1; i++) {
      if (i >= 0 && i < envelope.length) envelope[i] = 1
    }
  }

  const envelopeMean = mean(envelope)
  let energy = 0
  for (const value of envelope) energy += (value - envelopeMean) ** 2
  if (energy === 0) return 0

  const lowestLag = Math.round(PULSE_MIN_LAG_MS / track.hopMs)
  const highestLag = Math.round(PULSE_MAX_LAG_MS / track.hopMs)
  let best = 0

  for (let lag = lowestLag; lag <= highestLag; lag++) {
    let shared = 0
    for (let i = 0; i + lag < envelope.length; i++) {
      shared +=
        (envelope[i] - envelopeMean) * (envelope[i + lag] - envelopeMean)
    }
    best = Math.max(best, shared / energy)
  }

  return clamp01(best)
}

function measurePhrases(notes: TakeNote[]) {
  const phrases: { startMs: number; endMs: number }[] = []

  for (const note of notes) {
    const current = phrases[phrases.length - 1]
    if (current && note.startMs - current.endMs < PHRASE_GAP_MS) {
      current.endMs = note.endMs
    } else {
      phrases.push({ startMs: note.startMs, endMs: note.endMs })
    }
  }

  const phraseMs = phrases.map((phrase) => phrase.endMs - phrase.startMs)
  let totalPhraseMs = 0
  for (const duration of phraseMs) totalPhraseMs += duration

  let totalNoteMs = 0
  for (const note of notes) totalNoteMs += note.endMs - note.startMs

  return {
    medianPhraseMs: median(phraseMs),
    heldShare: totalPhraseMs > 0 ? totalNoteMs / totalPhraseMs : 0,
  }
}

function medianInterval(notes: TakeNote[]): number {
  const intervals: number[] = []
  for (let i = 1; i < notes.length; i++) {
    intervals.push(Math.abs(notes[i].midi - notes[i - 1].midi))
  }

  return median(intervals)
}

/*
 * What a take sounds like, from measurements only. Fast, Melodic and Monotonic
 * rest on direct readings. Romantic and Exotic are playful guesses: mood depends
 * on lyrics and culture, which pitch alone can't hear.
 */
export function buildTakeProfile({
  track,
  tunedMidi,
  soundGateDb,
  notes,
  activeMs,
  voicedMs,
  commonScaleCoverage,
  hasAutoGain,
}: ProfileInput): TakeProfile | null {
  if (activeMs === 0) return null

  const onsetsMs = findOnsetsMs(track, notes, soundGateDb)
  const onsetsPerSecond = onsetsMs.length / (activeMs / 1000)
  const voicedShare = voicedMs / activeMs

  const voiced = tunedMidi.filter((midi) => !Number.isNaN(midi))
  const rangeLowMidi = percentile(voiced, 0.05)
  const rangeHighMidi = percentile(voiced, 0.95)
  const rangeSemitones = rangeHighMidi - rangeLowMidi
  const interval = medianInterval(notes)

  const { medianPhraseMs, heldShare } = measurePhrases(notes)

  const activeLevels = track.rmsDb.filter((db) => db >= soundGateDb)
  const spreadDb =
    percentile(activeLevels, 0.95) - percentile(activeLevels, 0.1)

  const heldNotes = notes.filter((note) => note.wobbleCents !== null)
  const vibratoShare =
    heldNotes.length > 0
      ? heldNotes.filter((note) => note.vibrato).length / heldNotes.length
      : 0

  const centredShare =
    notes.length > 0
      ? notes.filter((note) => Math.abs(note.centsFromGrid) <= CLOSE_CENTS)
          .length / notes.length
      : 0

  const tempo = ramp(
    onsetsPerSecond,
    FAST_ONSETS_PER_SECOND.low,
    FAST_ONSETS_PER_SECOND.high,
  )
  const leaping = mean([
    ramp(
      rangeSemitones,
      LEAPING_RANGE_SEMITONES.low,
      LEAPING_RANGE_SEMITONES.high,
    ),
    ramp(
      interval,
      LEAPING_INTERVAL_SEMITONES.low,
      LEAPING_INTERVAL_SEMITONES.high,
    ),
  ])
  const choppy = ramp(heldShare, CHOPPY_HELD_SHARE.low, CHOPPY_HELD_SHARE.high)
  const rhythmic = ramp(
    measurePulse(onsetsMs, track),
    RHYTHMIC_CORRELATION.low,
    RHYTHMIC_CORRELATION.high,
  )
  const spoken = ramp(
    voicedShare,
    SPOKEN_VOICED_SHARE.low,
    SPOKEN_VOICED_SHARE.high,
  )
  const dramatic = hasAutoGain
    ? null
    : ramp(spreadDb, DRAMATIC_SPREAD_DB.low, DRAMATIC_SPREAD_DB.high)
  const colourful =
    centredShare >= COLOURFUL_MIN_CENTRED_SHARE
      ? ramp(
          1 - commonScaleCoverage,
          COLOURFUL_OUTSIDE_SHARE.low,
          COLOURFUL_OUTSIDE_SHARE.high,
        )
      : null

  const axes: ProfileAxis[] = [
    { key: 'tempo', value: tempo },
    { key: 'leaping', value: leaping },
    { key: 'choppy', value: choppy },
    { key: 'rhythmic', value: rhythmic },
    { key: 'spoken', value: spoken },
    ...(dramatic === null
      ? []
      : ([{ key: 'dramatic', value: dramatic }] as ProfileAxis[])),
    ...(colourful === null
      ? []
      : ([{ key: 'colourful', value: colourful }] as ProfileAxis[])),
  ]

  /* Each word's number is how strongly it applies, used only to pick the top. */
  const candidates: { key: ProfileWordKey; strength: number }[] = []
  const add = (key: ProfileWordKey, applies: boolean, strength: number) => {
    if (applies) candidates.push({ key, strength })
  }

  add('monotonic', notes.length > 0 && rangeSemitones <= 3, 1)
  add(
    'rapLike',
    voicedShare <= 0.55 && onsetsPerSecond >= 3 && rangeSemitones <= 7,
    0.95,
  )
  add(
    'melodic',
    voicedShare >= 0.7 && rangeSemitones >= 7 && interval <= 3,
    0.8,
  )
  add('fast', tempo >= 0.75, tempo)
  add('slow', notes.length > 0 && tempo <= 0.2, 1 - tempo)
  add('rhythmic', rhythmic >= 0.6, rhythmic * 0.9)
  add(
    'dramatic',
    dramatic !== null && dramatic >= 0.6 && rangeSemitones >= 5,
    dramatic ?? 0,
  )
  add('energetic', tempo >= 0.55 && rhythmic >= 0.4, (tempo + rhythmic) / 2)
  add(
    'romantic',
    notes.length > 0 &&
      tempo <= 0.35 &&
      choppy <= 0.3 &&
      rangeSemitones > 3 &&
      (vibratoShare >= 0.2 || rangeSemitones >= 5),
    0.6,
  )
  add('exotic', colourful !== null && colourful >= 0.6, 0.7)

  return {
    axes,
    words: candidates
      .toSorted((a, b) => b.strength - a.strength)
      .slice(0, MAX_WORDS)
      .map((word) => word.key),
    onsetsPerSecond,
    voicedShare,
    medianPhraseMs,
    vibratoShare,
    rangeLowMidi,
    rangeHighMidi,
  }
}

import type { FocusLevel } from '@/components/pitch-detector/focusLevel'
import { CLEAN_CENTS, CLOSE_CENTS, OFF_CENTS } from '@/utils/pitchColors'

import type { PitchTrack } from './pitchTrack'
import type { TakeNote } from './takeNotes'
import { clamp01, median, ramp } from './takeStats'

/* Below these a rating would say more about luck than about the singing. */
export const MIN_RATED_VOICED_MS = 15_000
const MIN_NOTES = 8
/* Shorter notes are passing tones, too brief to settle on a centre. */
const MIN_RATED_NOTE_MS = 250

const CENTRING_WEIGHT = 0.5
const STEADINESS_WEIGHT = 0.3
const KEY_WEIGHT = 0.2

/*
 * With no reference note, distance is measured to the nearest semitone, so
 * error tops out at 50¢. Random pitches land within CLOSE_CENTS (±20¢ of a 100¢
 * span) 40% of the time and within CLEAN_CENTS 20%. Those chance levels score 0,
 * or a guess would already look decent.
 */
const CHANCE_ON_PITCH_SHARE = (CLOSE_CENTS * 2) / 100
const CHANCE_SPOT_ON_SHARE = (CLEAN_CENTS * 2) / 100
const ON_PITCH_PART = 0.7
const SPOT_ON_PART = 0.3

/* A scale slip is rarer than a tuning slip: 70% in key is already poor. */
const IN_KEY_FLOOR = 0.7
/* A full semitone of drift across the take costs the whole key score. */
const FULL_PENALTY_DRIFT_CENTS = 100

/*
 * Overall score needed for each label, highest first. Starting values: these
 * need calibrating against real takes before the labels mean much.
 */
const TAKE_LEVEL_RULES: { level: FocusLevel; minScore: number }[] = [
  { level: 'pitchPerfect', minScore: 0.9 },
  { level: 'leadSinger', minScore: 0.75 },
  { level: 'stageReady', minScore: 0.6 },
  { level: 'niceAndClose', minScore: 0.4 },
  { level: 'findingIt', minScore: 0.2 },
  { level: 'warmingUp', minScore: 0 },
]

/* Scores all this high leave nothing useful to single out as a tip. */
const NO_TIP_MIN_SCORE = 0.85

export type RatingTip = 'centring' | 'steadiness' | 'key' | 'keepGoing'

export type TakeRating = {
  overall: number
  level: FocusLevel
  tip: RatingTip
  centring: number
  /* null when no notes were held long enough to judge. */
  steadiness: number | null
  stayInKey: number
  /* Reported for interest, never scored: absence isn't a flaw. */
  vibratoShare: number
  cleanStartShare: number
  medianClarity: number
}

type RatingInput = {
  track: PitchTrack
  notes: TakeNote[]
  voicedMs: number
  driftCents: number
  inScaleShare: number
}

function durationShare(
  notes: TakeNote[],
  matches: (note: TakeNote) => boolean,
) {
  let matchedMs = 0
  let totalMs = 0
  for (const note of notes) {
    const durationMs = note.endMs - note.startMs
    totalMs += durationMs
    if (matches(note)) matchedMs += durationMs
  }

  return totalMs > 0 ? matchedMs / totalMs : 0
}

function measureCentring(notes: TakeNote[]): number {
  const onPitch = durationShare(
    notes,
    (note) => Math.abs(note.centsFromGrid) <= CLOSE_CENTS,
  )
  const spotOn = durationShare(
    notes,
    (note) => Math.abs(note.centsFromGrid) <= CLEAN_CENTS,
  )

  return (
    ON_PITCH_PART * ramp(onPitch, CHANCE_ON_PITCH_SHARE, 1) +
    SPOT_ON_PART * ramp(spotOn, CHANCE_SPOT_ON_SHARE, 1)
  )
}

function pickTip(
  overall: number,
  centring: number,
  steadiness: number | null,
  stayInKey: number,
): RatingTip {
  if (overall >= NO_TIP_MIN_SCORE) return 'keepGoing'

  const scores: { tip: RatingTip; score: number }[] = [
    { tip: 'centring', score: centring },
    { tip: 'key', score: stayInKey },
  ]
  if (steadiness !== null) scores.push({ tip: 'steadiness', score: steadiness })

  return scores.toSorted((a, b) => a.score - b.score)[0].tip
}

/*
 * Measures consistency: how well notes sit on the singer's own tuning. It can't
 * know which notes were intended, and can't hear timbre, diction or emotion, so
 * it never claims to tell a professional from an amateur. Expressive scoops and
 * blue notes will lower it.
 */
export function buildTakeRating({
  track,
  notes,
  voicedMs,
  driftCents,
  inScaleShare,
}: RatingInput): TakeRating | null {
  if (voicedMs < MIN_RATED_VOICED_MS || notes.length < MIN_NOTES) return null

  const rated = notes.filter(
    (note) => note.endMs - note.startMs >= MIN_RATED_NOTE_MS && !note.isGlide,
  )
  if (rated.length === 0) return null

  const centring = measureCentring(rated)

  const wobbles = rated.flatMap((note) =>
    note.wobbleCents === null ? [] : [note.wobbleCents],
  )
  const steadiness =
    wobbles.length > 0 ? ramp(median(wobbles), OFF_CENTS, CLEAN_CENTS) : null

  const stayInKey = clamp01(
    ramp(inScaleShare, IN_KEY_FLOOR, 1) -
      Math.abs(driftCents) / FULL_PENALTY_DRIFT_CENTS,
  )

  /* Without held notes, steadiness's share of the score moves to the others. */
  const overall =
    steadiness === null
      ? (CENTRING_WEIGHT * centring + KEY_WEIGHT * stayInKey) /
        (CENTRING_WEIGHT + KEY_WEIGHT)
      : CENTRING_WEIGHT * centring +
        STEADINESS_WEIGHT * steadiness +
        KEY_WEIGHT * stayInKey

  const level =
    TAKE_LEVEL_RULES.find((rule) => overall >= rule.minScore)?.level ??
    'warmingUp'

  const heldNotes = notes.filter((note) => note.wobbleCents !== null)

  return {
    overall,
    level,
    tip: pickTip(overall, centring, steadiness, stayInKey),
    centring,
    steadiness,
    stayInKey,
    vibratoShare:
      heldNotes.length > 0
        ? heldNotes.filter((note) => note.vibrato).length / heldNotes.length
        : 0,
    cleanStartShare: durationShare(rated, (note) => note.hasCleanStart),
    medianClarity: median(track.clarity.filter((clarity) => clarity > 0)),
  }
}

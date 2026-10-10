import type { AccidentalStyle } from '@/composables/accidentalStyle'
import { midiToNoteLabel, SCALE_MODE_OPTIONS } from '@/utils/noteUtils'
import {
  buildScalePitchClasses,
  pitchClassOf,
  SCALE_HIGHLIGHT_MODES,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'

/* One sung or played note, in the order it was heard. */
export type SungNote = { midi: number; durationMs: number }

export type ScaleCandidate = {
  /* Pitch class 0–11 of the tonic. */
  root: number
  mode: ScaleHighlightMode
  tonicScore: number
}

/*
 * Candidates that share exactly the same notes — C major, A minor, D Dorian…
 * They are told apart only by which note feels like home, so they are shown
 * together. candidates[0] is the likeliest home; the rest are its twins.
 */
export type ScaleFamily = {
  pitchClasses: ReadonlySet<number>
  /* Scale notes not sung yet, ascending from the top candidate's root. */
  missingPitchClasses: number[]
  candidates: ScaleCandidate[]
}

export type ScaleDetection = {
  sungPitchClasses: ReadonlySet<number>
  /* Below this, almost every scale fits — results are shown as a hint only. */
  hasEnoughNotes: boolean
  families: ScaleFamily[]
  /* When the top two families fit equally well: one note from each that the
   * other lacks. Singing either settles it. */
  tieBreaker: { pitchClasses: [number, number] } | null
}

/* Four notes cut the 204 candidates down to a handful; three (C D E) still
 * fit a dozen families. */
export const MIN_DISTINCT_PITCH_CLASSES = 4

/* A note's weight stops growing after 2 s, so one long hold can't outvote
 * everything else for tonic. */
const NOTE_WEIGHT_CAP_MS = 2000

/*
 * Tonic evidence, in points. Singers usually start a run on its home note,
 * so the first note counts most; melodies also tend to come back home at the
 * end. Weight share (0–1) is scaled so a note sung a lot can still break a
 * tie between first/last-note candidates.
 */
const FIRST_NOTE_POINTS = 3
const LAST_NOTE_POINTS = 2
const LONGEST_NOTE_POINTS = 1
const WEIGHT_SHARE_POINTS = 2

/* The longest note only earns its point when it was clearly held — 1.5× the
 * average note. Otherwise a run of even notes hands the point to whichever
 * was a few ms longer. */
const LONGEST_NOTE_RATIO = 1.5

/* Scores closer than this count as equal, so the more familiar mode wins
 * instead of a sliver of weight share from timing noise. */
const TONIC_SCORE_TOLERANCE = 0.25

/* A less familiar mode only beats a more familiar one when its root has this
 * much more tonic evidence — starting AND ending on it. Starting on B alone
 * doesn't make B C D E F G Locrian; C major is far likelier. */
const UNFAMILIAR_MODE_MARGIN = FIRST_NOTE_POINTS + LAST_NOTE_POINTS

/* Lower = more familiar. Popular (Major, Minor, Pentatonic, Blues) beats the
 * church modes, which beat everything else. */
const MODE_TIER: Record<ScaleHighlightMode, number> = Object.fromEntries(
  SCALE_HIGHLIGHT_MODES.map((mode) => {
    const group = SCALE_MODE_OPTIONS.find((option) => option.id === mode)?.group
    const tier = group === 'popular' ? 0 : group === 'church' ? 1 : 2

    return [mode, tier]
  }),
) as Record<ScaleHighlightMode, number>

const SEMITONES_PER_OCTAVE = 12

type TonicEvidence = {
  first: number
  last: number
  longest: number | null
  weightShare: Map<number, number>
}

function gatherTonicEvidence(notes: SungNote[]): TonicEvidence {
  const weights = new Map<number, number>()
  let longest = notes[0]

  for (const note of notes) {
    const pitchClass = pitchClassOf(note.midi)
    const weight = Math.min(note.durationMs, NOTE_WEIGHT_CAP_MS)
    weights.set(pitchClass, (weights.get(pitchClass) ?? 0) + weight)
    if (note.durationMs > longest.durationMs) longest = note
  }

  const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0)
  const averageMs = total / notes.length
  const isLongestClearlyHeld =
    Math.min(longest.durationMs, NOTE_WEIGHT_CAP_MS) >=
    averageMs * LONGEST_NOTE_RATIO
  const weightShare = new Map(
    [...weights].map(([pitchClass, weight]) => [
      pitchClass,
      total > 0 ? weight / total : 0,
    ]),
  )

  return {
    first: pitchClassOf(notes[0].midi),
    last: pitchClassOf(notes.at(-1)!.midi),
    longest: isLongestClearlyHeld ? pitchClassOf(longest.midi) : null,
    weightShare,
  }
}

function tonicScoreFor(root: number, evidence: TonicEvidence): number {
  const share = evidence.weightShare.get(root)
  if (share === undefined) return 0

  return (
    (root === evidence.first ? FIRST_NOTE_POINTS : 0) +
    (root === evidence.last ? LAST_NOTE_POINTS : 0) +
    (root === evidence.longest ? LONGEST_NOTE_POINTS : 0) +
    share * WEIGHT_SHARE_POINTS
  )
}

/* Sorted pitch classes as a string, so equal sets group under one key. */
function setKey(pitchClasses: ReadonlySet<number>): string {
  return [...pitchClasses].sort((a, b) => a - b).join(',')
}

function compareByTonic(a: ScaleCandidate, b: ScaleCandidate): number {
  const scoreDifference = b.tonicScore - a.tonicScore
  const tierDifference = MODE_TIER[a.mode] - MODE_TIER[b.mode]
  if (
    tierDifference !== 0 &&
    Math.abs(scoreDifference) < UNFAMILIAR_MODE_MARGIN
  ) {
    return tierDifference
  }
  if (Math.abs(scoreDifference) >= TONIC_SCORE_TOLERANCE) return scoreDifference

  return (
    tierDifference ||
    SCALE_HIGHLIGHT_MODES.indexOf(a.mode) -
      SCALE_HIGHLIGHT_MODES.indexOf(b.mode) ||
    a.root - b.root
  )
}

/* Twins after the home: familiar names first (so C major's twin reads
 * "A minor" before "D Dorian"), then by tonic evidence. */
function compareTwins(a: ScaleCandidate, b: ScaleCandidate): number {
  return MODE_TIER[a.mode] - MODE_TIER[b.mode] || compareByTonic(a, b)
}

function rotateFrom(root: number, pitchClasses: Iterable<number>): number[] {
  const distance = (pitchClass: number) => pitchClassOf(pitchClass - root)

  return [...pitchClasses].sort((a, b) => distance(a) - distance(b))
}

function compareFamilies(a: ScaleFamily, b: ScaleFamily): number {
  const [homeA] = a.candidates
  const [homeB] = b.candidates

  return (
    a.missingPitchClasses.length - b.missingPitchClasses.length ||
    MODE_TIER[homeA.mode] - MODE_TIER[homeB.mode] ||
    compareByTonic(homeA, homeB)
  )
}

function findTieBreaker(families: ScaleFamily[]): ScaleDetection['tieBreaker'] {
  const [first, second] = families
  if (!first || !second) return null
  if (first.missingPitchClasses.length !== second.missingPitchClasses.length) {
    return null
  }

  const onlyFirst = first.missingPitchClasses.find(
    (pitchClass) => !second.pitchClasses.has(pitchClass),
  )
  const onlySecond = second.missingPitchClasses.find(
    (pitchClass) => !first.pitchClasses.has(pitchClass),
  )
  if (onlyFirst === undefined || onlySecond === undefined) return null

  return { pitchClasses: [onlyFirst, onlySecond] }
}

/**
 * Which scales the sung notes could belong to, best first. Matching is
 * octave-agnostic and strict: every sung pitch class must be in the scale.
 * Scales with identical notes are grouped into one family, ranked inside by
 * tonic evidence (first, last, longest and most-sung note).
 */
export function detectScales(notes: SungNote[]): ScaleDetection {
  const sungPitchClasses = new Set(notes.map((note) => pitchClassOf(note.midi)))
  const hasEnoughNotes = sungPitchClasses.size >= MIN_DISTINCT_PITCH_CLASSES

  if (notes.length === 0) {
    return { sungPitchClasses, hasEnoughNotes, families: [], tieBreaker: null }
  }

  const evidence = gatherTonicEvidence(notes)
  const byNotes = new Map<
    string,
    { pitchClasses: ReadonlySet<number>; candidates: ScaleCandidate[] }
  >()

  for (let root = 0; root < SEMITONES_PER_OCTAVE; root++) {
    for (const mode of SCALE_HIGHLIGHT_MODES) {
      const pitchClasses = buildScalePitchClasses(root, mode)
      const fits = [...sungPitchClasses].every((pitchClass) =>
        pitchClasses.has(pitchClass),
      )
      if (!fits) continue

      const key = setKey(pitchClasses)
      const family = byNotes.get(key) ?? { pitchClasses, candidates: [] }
      family.candidates.push({
        root,
        mode,
        tonicScore: tonicScoreFor(root, evidence),
      })
      byNotes.set(key, family)
    }
  }

  const families = [...byNotes.values()].map(({ pitchClasses, candidates }) => {
    const [home, ...twins] = [...candidates].sort(compareByTonic)
    const missing = [...pitchClasses].filter(
      (pitchClass) => !sungPitchClasses.has(pitchClass),
    )

    return {
      pitchClasses,
      missingPitchClasses: rotateFrom(home.root, missing),
      candidates: [home, ...twins.sort(compareTwins)],
    }
  })
  families.sort(compareFamilies)

  return {
    sungPitchClasses,
    hasEnoughNotes,
    families,
    tieBreaker: hasEnoughNotes ? findTieBreaker(families) : null,
  }
}

/* Letter name of each pitch class under each spelling — C♯ and D♭ differ. */
const SHARP_LETTERS = 'CCDDEFFGGAAB'
const FLAT_LETTERS = 'CDDEEFGGAABB'

/* Black-key roots conventionally written with flats: D♭, E♭, A♭, B♭. F♯ is
 * the one written with sharps. */
const FLAT_ROOTS = new Set([1, 3, 8, 10])

const BLACK_KEYS = new Set([1, 3, 6, 8, 10])

/* Semitones above the root read as lowered degrees: ♭2, ♭3, ♭5, ♭6, ♭7. */
const LOWERED_DEGREES = new Set([1, 3, 6, 8, 10])

/**
 * Sharps or flats for a scale's note names. A well-spelled scale uses each
 * letter at most once (F major has B♭, not A♯; A minor blues has E♭, not
 * D♯), so pick the spelling with more distinct letters. On a tie a
 * black-key root decides; otherwise a black key on a lowered degree reads as
 * a flat (the blue note is E♭ in A minor blues), and all-natural scales don't
 * care.
 */
export function keyAccidentalStyle(
  root: number,
  mode: ScaleHighlightMode,
): AccidentalStyle {
  const pitchClasses = [...buildScalePitchClasses(root, mode)]
  const distinctLetters = (letters: string) =>
    new Set(pitchClasses.map((pitchClass) => letters[pitchClass])).size
  const sharpCount = distinctLetters(SHARP_LETTERS)
  const flatCount = distinctLetters(FLAT_LETTERS)

  if (flatCount !== sharpCount) return flatCount > sharpCount ? 'flat' : 'sharp'

  const rootPitchClass = pitchClassOf(root)
  if (BLACK_KEYS.has(rootPitchClass)) {
    return FLAT_ROOTS.has(rootPitchClass) ? 'flat' : 'sharp'
  }

  const hasLoweredBlackKey = pitchClasses.some(
    (pitchClass) =>
      BLACK_KEYS.has(pitchClass) &&
      LOWERED_DEGREES.has(pitchClassOf(pitchClass - rootPitchClass)),
  )

  return hasLoweredBlackKey ? 'flat' : 'sharp'
}

/* MIDI 60 = C4 — an arbitrary octave, used only to borrow noteUtils' naming. */
const LABEL_OCTAVE_MIDI = 60

/** "C", "F♯", "B♭" — a pitch class spelled for the given style. */
export function pitchClassLabel(
  pitchClass: number,
  accidentalStyle: AccidentalStyle,
): string {
  return midiToNoteLabel(LABEL_OCTAVE_MIDI + pitchClassOf(pitchClass), {
    showOctave: false,
    preferFlats: accidentalStyle === 'flat',
  }).label
}

import type { AccidentalStyle } from '@/composables/accidentalStyle'
import {
  notesAccidentalStyle,
  pitchClassLabel,
  type SungNote,
} from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'

export type ChordTypeId =
  | 'major'
  | 'minor'
  | 'diminished'
  | 'augmented'
  | 'sus2'
  | 'sus4'
  | 'dominant7'
  | 'major7'
  | 'minor7'
  | 'halfDiminished7'
  | 'diminished7'
  | 'minorMajor7'
  | 'major6'
  | 'minor6'
  | 'dominant7sus4'
  | 'add9'
  | 'dominant9'
  | 'major9'
  | 'minor9'

type ChordType = {
  id: ChordTypeId
  /* Semitones above the root, in chord-degree order (root, 3rd, 5th, 7th, 9th). */
  semitones: readonly number[]
  /* Written after the root: C + 'm7' = Cm7. Major triads have none. */
  suffix: string
  /* Lower = more familiar: triads, then four-note chords, then 9ths. */
  tier: number
}

/* 14 = a 9th (an octave plus a whole step); pitchClassOf folds it to 2. */
export const CHORD_TYPES: readonly ChordType[] = [
  { id: 'major', semitones: [0, 4, 7], suffix: '', tier: 0 },
  { id: 'minor', semitones: [0, 3, 7], suffix: 'm', tier: 0 },
  { id: 'diminished', semitones: [0, 3, 6], suffix: 'dim', tier: 0 },
  { id: 'augmented', semitones: [0, 4, 8], suffix: 'aug', tier: 0 },
  { id: 'sus2', semitones: [0, 2, 7], suffix: 'sus2', tier: 0 },
  { id: 'sus4', semitones: [0, 5, 7], suffix: 'sus4', tier: 0 },
  { id: 'dominant7', semitones: [0, 4, 7, 10], suffix: '7', tier: 1 },
  { id: 'major7', semitones: [0, 4, 7, 11], suffix: 'maj7', tier: 1 },
  { id: 'minor7', semitones: [0, 3, 7, 10], suffix: 'm7', tier: 1 },
  { id: 'halfDiminished7', semitones: [0, 3, 6, 10], suffix: 'm7♭5', tier: 1 },
  { id: 'diminished7', semitones: [0, 3, 6, 9], suffix: 'dim7', tier: 1 },
  { id: 'minorMajor7', semitones: [0, 3, 7, 11], suffix: 'm(maj7)', tier: 1 },
  { id: 'major6', semitones: [0, 4, 7, 9], suffix: '6', tier: 1 },
  { id: 'minor6', semitones: [0, 3, 7, 9], suffix: 'm6', tier: 1 },
  { id: 'dominant7sus4', semitones: [0, 5, 7, 10], suffix: '7sus4', tier: 1 },
  { id: 'add9', semitones: [0, 4, 7, 14], suffix: 'add9', tier: 1 },
  { id: 'dominant9', semitones: [0, 4, 7, 10, 14], suffix: '9', tier: 2 },
  { id: 'major9', semitones: [0, 4, 7, 11, 14], suffix: 'maj9', tier: 2 },
  { id: 'minor9', semitones: [0, 3, 7, 10, 14], suffix: 'm9', tier: 2 },
]

const CHORD_TYPE_BY_ID = new Map(CHORD_TYPES.map((type) => [type.id, type]))

export type ChordCandidate = {
  /* Pitch class 0–11 of the root. */
  root: number
  type: ChordTypeId
  rootScore: number
}

/*
 * Chords that share exactly the same notes — C6 and Am7, Csus4 and Fsus2.
 * They differ only in which note is heard as the root, so they are shown
 * together. candidates[0] is the likeliest root; the rest are its twins.
 */
export type ChordFamily = {
  pitchClasses: ReadonlySet<number>
  /* Chord notes not sung yet, in chord-degree order of the top candidate. */
  missingPitchClasses: number[]
  candidates: ChordCandidate[]
}

export type ChordDetection = {
  sungPitchClasses: ReadonlySet<number>
  /* Pitch class of the lowest note sung — a chord over another bass note is
   * written as a slash chord (C/E). Null before anything is sung. */
  bass: number | null
  /* Below this, almost any chord fits — results are shown as a hint only. */
  hasEnoughNotes: boolean
  families: ChordFamily[]
}

/* A triad is the smallest real chord; two notes fit a dozen of them. */
export const MIN_CHORD_PITCH_CLASSES = 3

/* A note's weight stops growing after 2 s, so one long hold can't outvote
 * the bass for the root. */
const NOTE_WEIGHT_CAP_MS = 2000

/*
 * Root evidence, in points. Chords are named from the bass up, so the lowest
 * note counts most; singers arpeggiating a chord usually start on its root.
 * Weight share (0–1) lets a note sung a lot break the remaining ties.
 */
const BASS_POINTS = 3
const FIRST_NOTE_POINTS = 2
const WEIGHT_SHARE_POINTS = 1

export function chordPitchClasses(
  root: number,
  type: ChordTypeId,
): ReadonlySet<number> {
  const { semitones } = CHORD_TYPE_BY_ID.get(type)!

  return new Set(semitones.map((semitone) => pitchClassOf(root + semitone)))
}

type RootEvidence = {
  bass: number
  first: number
  weightShare: Map<number, number>
}

function gatherRootEvidence(notes: SungNote[]): RootEvidence {
  const weights = new Map<number, number>()
  let lowest = notes[0]

  for (const note of notes) {
    const pitchClass = pitchClassOf(note.midi)
    const weight = Math.min(note.durationMs, NOTE_WEIGHT_CAP_MS)
    weights.set(pitchClass, (weights.get(pitchClass) ?? 0) + weight)
    if (note.midi < lowest.midi) lowest = note
  }

  const total = [...weights.values()].reduce((sum, weight) => sum + weight, 0)

  return {
    bass: pitchClassOf(lowest.midi),
    first: pitchClassOf(notes[0].midi),
    weightShare: new Map(
      [...weights].map(([pitchClass, weight]) => [
        pitchClass,
        total > 0 ? weight / total : 0,
      ]),
    ),
  }
}

function rootScoreFor(root: number, evidence: RootEvidence): number {
  return (
    (root === evidence.bass ? BASS_POINTS : 0) +
    (root === evidence.first ? FIRST_NOTE_POINTS : 0) +
    (evidence.weightShare.get(root) ?? 0) * WEIGHT_SHARE_POINTS
  )
}

const typeOrder = (type: ChordTypeId) =>
  CHORD_TYPES.findIndex((chordType) => chordType.id === type)
const tierOf = (type: ChordTypeId) => CHORD_TYPE_BY_ID.get(type)!.tier

function compareByRoot(a: ChordCandidate, b: ChordCandidate): number {
  return (
    b.rootScore - a.rootScore ||
    tierOf(a.type) - tierOf(b.type) ||
    typeOrder(a.type) - typeOrder(b.type) ||
    a.root - b.root
  )
}

function compareFamilies(a: ChordFamily, b: ChordFamily): number {
  const [homeA] = a.candidates
  const [homeB] = b.candidates

  return (
    a.missingPitchClasses.length - b.missingPitchClasses.length ||
    tierOf(homeA.type) - tierOf(homeB.type) ||
    compareByRoot(homeA, homeB)
  )
}

/* Sorted pitch classes as a string, so equal sets group under one key. */
function setKey(pitchClasses: ReadonlySet<number>): string {
  return [...pitchClasses].sort((a, b) => a - b).join(',')
}

/**
 * Which chords the sung notes could spell, best first. Matching is
 * octave-agnostic and strict — every sung pitch class must be in the chord —
 * and the root must be one of the sung notes, or two notes would fit almost
 * anything. Chords with identical notes are grouped into one family, ranked
 * inside by root evidence (lowest, first and most-sung note).
 */
export function detectChords(notes: SungNote[]): ChordDetection {
  const sungPitchClasses = new Set(notes.map((note) => pitchClassOf(note.midi)))
  const hasEnoughNotes = sungPitchClasses.size >= MIN_CHORD_PITCH_CLASSES

  if (notes.length === 0) {
    return { sungPitchClasses, bass: null, hasEnoughNotes, families: [] }
  }

  const evidence = gatherRootEvidence(notes)
  const byNotes = new Map<
    string,
    { pitchClasses: ReadonlySet<number>; candidates: ChordCandidate[] }
  >()

  for (const root of sungPitchClasses) {
    for (const { id } of CHORD_TYPES) {
      const pitchClasses = chordPitchClasses(root, id)
      const fits = [...sungPitchClasses].every((pitchClass) =>
        pitchClasses.has(pitchClass),
      )
      if (!fits) continue

      const key = setKey(pitchClasses)
      const family = byNotes.get(key) ?? { pitchClasses, candidates: [] }
      family.candidates.push({
        root,
        type: id,
        rootScore: rootScoreFor(root, evidence),
      })
      byNotes.set(key, family)
    }
  }

  const families = [...byNotes.values()].map(({ pitchClasses, candidates }) => {
    const sorted = [...candidates].sort(compareByRoot)
    const [home] = sorted
    const missing = CHORD_TYPE_BY_ID.get(home.type)!
      .semitones.map((semitone) => pitchClassOf(home.root + semitone))
      .filter((pitchClass) => !sungPitchClasses.has(pitchClass))

    return { pitchClasses, missingPitchClasses: missing, candidates: sorted }
  })
  families.sort(compareFamilies)

  return { sungPitchClasses, bass: evidence.bass, hasEnoughNotes, families }
}

/* ♭2/♭9, ♭3, ♭5 and ♭7 — chord tones written as lowered degrees. 8 is
 * missing on purpose: the only chord here with it is augmented, where it is
 * a raised 5th (C E G♯, not C E A♭). */
const CHORD_LOWERED_DEGREES = new Set([1, 3, 6, 10])

/*
 * Sharps or flats for a chord's note names, from the chord's own notes —
 * the same rule as scales. So D major spells F♯, F minor A♭, C7 B♭ and
 * C augmented G♯.
 */
export function chordAccidentalStyle(
  root: number,
  type: ChordTypeId,
): AccidentalStyle {
  const { semitones } = CHORD_TYPE_BY_ID.get(type)!

  return notesAccidentalStyle(
    root,
    semitones.map((semitone) => pitchClassOf(root + semitone)),
    CHORD_LOWERED_DEGREES,
  )
}

/**
 * "C", "Am7", "B♭maj7" — or a slash chord ("C/E") when another chord note is
 * in the bass.
 */
export function chordSymbol(
  root: number,
  type: ChordTypeId,
  bass: number | null = null,
): string {
  const style = chordAccidentalStyle(root, type)
  const symbol =
    pitchClassLabel(root, style) + CHORD_TYPE_BY_ID.get(type)!.suffix
  if (bass === null || pitchClassOf(bass) === pitchClassOf(root)) return symbol

  return `${symbol}/${pitchClassLabel(bass, style)}`
}

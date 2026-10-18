import { midiToNoteLabel } from '@/utils/noteUtils'
import { pitchClassLabel } from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'

export type CircleDirection = 'clockwise' | 'counterClockwise'
export type CircleView = 'fifths' | 'chromatic'
export type CircleMode = 'walk' | 'explore'
export type AccidentalType = 'sharp' | 'flat'
export type MidiWindow = { midiMin: number; midiMax: number }

export type CircleKey = {
  /* Position on the circle of fifths — C = 0 at 12 o'clock, G = 1 … F = 11 */
  index: number
  pitchClass: number
  label: string
  /* The enharmonic twin at the bottom of the circle (F♯ = G♭) */
  alternateLabel: string | null
  accidentalCount: number
  accidentalType: AccidentalType | null
  signatureNotes: readonly string[]
  minorLabel: string
  alternateMinorLabel: string | null
}

export const CIRCLE_DIRECTIONS = [
  'clockwise',
  'counterClockwise',
] as const satisfies readonly CircleDirection[]
export const CIRCLE_VIEWS = [
  'fifths',
  'chromatic',
] as const satisfies readonly CircleView[]
export const CIRCLE_MODES = [
  'walk',
  'explore',
] as const satisfies readonly CircleMode[]

const KEY_COUNT = 12
const DEGREES_PER_KEY = 360 / KEY_COUNT
/* A perfect fifth is 7 semitones — stepping by it visits all 12 pitch classes */
export const FIFTH_SEMITONES = 7
/* The relative minor's tonic (LA) sits 9 semitones above DO */
const RELATIVE_MINOR_SEMITONES = 9
/* F♯ / G♭ — the one key spelled both ways at the bottom of the circle */
const ENHARMONIC_INDEX = 6

/*
 * Sharps and flats enter a key signature in a fixed order. Each new sharp is TI
 * of the next key clockwise; each new flat is FA of the next key
 * counter-clockwise. Hand-typed because the shared note tables never spell E♯
 * or C♭, which the six-accidental keys need.
 */
const SHARP_ORDER = ['F♯', 'C♯', 'G♯', 'D♯', 'A♯', 'E♯'] as const
const FLAT_ORDER = ['B♭', 'E♭', 'A♭', 'D♭', 'G♭', 'C♭'] as const

function buildCircleKey(index: number): CircleKey {
  const pitchClass = pitchClassOf(index * FIFTH_SEMITONES)
  const minorPitchClass = pitchClassOf(pitchClass + RELATIVE_MINOR_SEMITONES)
  /* Right half of the circle is spelled with sharps, left half with flats */
  const style = index <= ENHARMONIC_INDEX ? 'sharp' : 'flat'
  const accidentalCount = index <= ENHARMONIC_INDEX ? index : KEY_COUNT - index
  const accidentalType = accidentalCount === 0 ? null : style
  const isEnharmonic = index === ENHARMONIC_INDEX

  return {
    index,
    pitchClass,
    label: pitchClassLabel(pitchClass, style),
    alternateLabel: isEnharmonic ? pitchClassLabel(pitchClass, 'flat') : null,
    accidentalCount,
    accidentalType,
    signatureNotes: (style === 'sharp' ? SHARP_ORDER : FLAT_ORDER).slice(
      0,
      accidentalCount,
    ),
    minorLabel: `${pitchClassLabel(minorPitchClass, style)}m`,
    alternateMinorLabel: isEnharmonic
      ? `${pitchClassLabel(minorPitchClass, 'flat')}m`
      : null,
  }
}

export const CIRCLE_KEYS: readonly CircleKey[] = Array.from(
  { length: KEY_COUNT },
  (_, index) => buildCircleKey(index),
)

/* "2♯", "3♭", or an empty string for C */
export function accidentalCountLabel(key: CircleKey): string {
  if (!key.accidentalType) return ''

  const glyph = key.accidentalType === 'sharp' ? '♯' : '♭'
  const label = `${key.accidentalCount}${glyph}`

  return key.alternateLabel ? `${label}/${key.accidentalCount}♭` : label
}

export function nextKeyIndex(index: number, direction: CircleDirection) {
  const step = direction === 'clockwise' ? 1 : -1

  return (index + step + KEY_COUNT) % KEY_COUNT
}

/* All 12 keys from C, plus C again at the end — the walk finishes back home */
export function walkKeyOrder(direction: CircleDirection): number[] {
  const order = [0]
  for (let i = 0; i < KEY_COUNT; i++) {
    order.push(nextKeyIndex(order[i], direction))
  }

  return order
}

export function fifthsAngle(index: number) {
  return index * DEGREES_PER_KEY
}

/*
 * Angle of a key on the chromatic (half-step) circle, where it sits at
 * pitchClass × 30°. pitchClass ≡ 7·index (mod 12), and 7·index − index = 6·index,
 * so the chromatic angle is the fifths angle plus 180°·index: even keys stay put
 * and odd keys swap to the opposite side. Adding exactly 0° or 180° (instead of
 * normalising to 0–360°) keeps a CSS transition between the views to at most
 * half a turn.
 */
export function chromaticAngle(index: number) {
  return fifthsAngle(index) + (index % 2 === 1 ? 180 : 0)
}

export function keyAngle(index: number, view: CircleView) {
  return view === 'fifths' ? fifthsAngle(index) : chromaticAngle(index)
}

/* SVG coordinates for a clock angle — 0° points up, angles grow clockwise */
export function polarPoint(angleDeg: number, radius: number) {
  const radians = (angleDeg * Math.PI) / 180

  return { x: radius * Math.sin(radians), y: -radius * Math.cos(radians) }
}

/* A ring segment one key wide, pointing straight up; rotate it into place */
export function wedgePath(innerRadius: number, outerRadius: number) {
  const halfAngle = DEGREES_PER_KEY / 2
  const outerStart = polarPoint(-halfAngle, outerRadius)
  const outerEnd = polarPoint(halfAngle, outerRadius)
  const innerEnd = polarPoint(halfAngle, innerRadius)
  const innerStart = polarPoint(-halfAngle, innerRadius)
  const format = (value: number) => value.toFixed(3)

  return [
    `M ${format(outerStart.x)} ${format(outerStart.y)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${format(outerEnd.x)} ${format(outerEnd.y)}`,
    `L ${format(innerEnd.x)} ${format(innerEnd.y)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${format(innerStart.x)} ${format(innerStart.y)}`,
    'Z',
  ].join(' ')
}

/*
 * Octaves the singer can move every note by, on top of the voice range. Each
 * range picks the octave that sits in its middle, which isn't always the one
 * the singer wants — Baritone plays C as C4, though C3 fits too.
 */
export const OCTAVE_SHIFTS = [-1, 0, 1] as const
export type OctaveShift = (typeof OCTAVE_SHIFTS)[number]

const OCTAVE_SEMITONES = 12

/* The voice range moved by whole octaves, so every placement moves with it */
export function shiftRange(range: MidiWindow, octaves: number): MidiWindow {
  const semitones = octaves * OCTAVE_SEMITONES

  return {
    midiMin: range.midiMin + semitones,
    midiMax: range.midiMax + semitones,
  }
}

/*
 * The 12 semitones in the middle of the voice range, where the walk's targets
 * live. A fifth up and a fourth down land on the same note name exactly an
 * octave apart, so exactly one of them always falls inside a 12-note window:
 * the walk alternates between hopping up and hopping down on its own and never
 * climbs out of the singer's range. Every VOICE_RANGES entry spans at least
 * 12 semitones, so the window always fits.
 */
export function walkWindow(range: MidiWindow): MidiWindow {
  const centeredMin = Math.floor((range.midiMin + range.midiMax - 11) / 2)
  const midiMin = Math.max(
    range.midiMin,
    Math.min(centeredMin, range.midiMax - 11),
  )

  return { midiMin, midiMax: midiMin + 11 }
}

/*
 * The circle position of the key whose DO has this pitch class. A key's pitch
 * class is 7·index (mod 12), and 7 is its own inverse mod 12 (7 × 7 = 49 ≡ 1),
 * so multiplying by 7 again turns a pitch class back into an index. Accepts a
 * MIDI note too, since only its pitch class matters.
 */
export function keyIndexOfPitchClass(pitchClass: number) {
  return pitchClassOf(pitchClass * FIFTH_SEMITONES)
}

/*
 * Where the minor key starting on this pitch sits — on the inner ring, under
 * its relative major (Em under G), so it's that major key's index. Accepts a
 * MIDI note too.
 */
export function minorKeyIndexOfPitchClass(pitchClass: number) {
  return keyIndexOfPitchClass(pitchClass - RELATIVE_MINOR_SEMITONES)
}

/*
 * A note's label spelled the way the wheel spells its wedge — A♭3, not G♯3,
 * because the wedge it lights reads A♭. Theory would spell the note by the key
 * it sits in (G♯ is MI of E), but the singer compares the label with the wheel
 * beside it, so one spelling per pitch keeps the two from disagreeing.
 */
export function wheelNoteLabel(midi: number) {
  return midiToNoteLabel(midi, {
    preferFlats: keyIndexOfPitchClass(midi) > ENHARMONIC_INDEX,
  }).label
}

/*
 * A note spelled by a key's signature, without the octave — B major's MI is
 * D♯, not the wheel's E♭. For naming a chord's notes, where theory spelling
 * matters more than matching a wedge.
 */
export function keyNoteLabel(midi: number, keyIndex: number) {
  return midiToNoteLabel(midi, {
    showOctave: false,
    preferFlats: keyIndex > ENHARMONIC_INDEX,
  }).label
}

const NOTE_LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const

/*
 * A key's major scale spelled DO to DO — G A B C D E F♯ G. A major scale uses
 * each letter once, so every degree gets the next letter, sharpened or
 * flattened when the key signature lists it. Spelled by letter rather than
 * through keyNoteLabel, which can't produce F♯ major's E♯.
 */
export function majorScaleSpelling(keyIndex: number): string[] {
  const key = CIRCLE_KEYS[keyIndex]
  const tonicLetterIndex = NOTE_LETTERS.findIndex((letter) =>
    key.label.startsWith(letter),
  )
  const degrees = NOTE_LETTERS.map((_, degree) => {
    const letter =
      NOTE_LETTERS[(tonicLetterIndex + degree) % NOTE_LETTERS.length]

    return key.signatureNotes.find((note) => note.startsWith(letter)) ?? letter
  })

  return [...degrees, degrees[0]]
}

/* The single MIDI note with this pitch class inside a 12-note window */
export function placePitchClass(pitchClass: number, window: MidiWindow) {
  return window.midiMin + pitchClassOf(pitchClass - window.midiMin)
}

/*
 * Places a short melody (semitone offsets from DO) so as little of it as
 * possible falls outside the voice range. A 12-semitone range can't hold every
 * key's DO MI SO, so the tonic with the smallest overflow wins, nearest the
 * middle of the range on a tie. Returns the tonic MIDI note.
 */
export function placePattern(
  pitchClass: number,
  offsets: readonly number[],
  range: MidiWindow,
) {
  const center = (range.midiMin + range.midiMax) / 2
  const lowest = placePitchClass(pitchClass, walkWindow(range))
  /* Three octave candidates around the window cover every placement worth trying */
  const candidates = [lowest - 12, lowest, lowest + 12]

  const overflow = (tonic: number) =>
    offsets.reduce((total, offset) => {
      const midi = tonic + offset
      return (
        total +
        Math.max(0, range.midiMin - midi) +
        Math.max(0, midi - range.midiMax)
      )
    }, 0)

  return candidates.reduce((best, tonic) => {
    const difference = overflow(tonic) - overflow(best)
    if (difference < 0) return tonic
    if (difference > 0) return best

    return Math.abs(tonic - center) < Math.abs(best - center) ? tonic : best
  })
}

export type WalkStep = {
  keyIndex: number
  rootMidi: number
  nextMidi: number
}

/* One step per key: sing its DO, then hop to the next key's DO */
export function buildWalkSteps(
  direction: CircleDirection,
  range: MidiWindow,
): WalkStep[] {
  const window = walkWindow(range)
  const order = walkKeyOrder(direction)
  const midiOf = (index: number) =>
    placePitchClass(CIRCLE_KEYS[index].pitchClass, window)

  return order.slice(0, -1).map((keyIndex, step) => ({
    keyIndex,
    rootMidi: midiOf(keyIndex),
    nextMidi: midiOf(order[step + 1]),
  }))
}

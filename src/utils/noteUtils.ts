const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const

export type NoteName = (typeof NOTE_NAMES)[number]

export type NoteInfo = {
  note: NoteName
  octave: number
  cents: number
  midiNote: number
  frequency: number
}

/**
 * Convert a frequency in Hz to the nearest musical note with cents deviation.
 * Uses A4 = 440 Hz as the reference pitch.
 *
 * When `previousMidi` is supplied, hysteresis is applied: the detected note
 * only changes when the raw MIDI value deviates *more than* 0.5 semitones
 * (> 50 cents) from the previous note. This prevents the displayed note from
 * flickering when the pitch sits exactly on the midpoint between two semitones.
 */
export function frequencyToNote(
  hz: number,
  previousMidi?: number,
): NoteInfo | null {
  if (hz <= 0 || !isFinite(hz)) return null

  const rawMidi = 12 * Math.log2(hz / 440) + 69

  let midiNote: number
  if (previousMidi !== undefined) {
    const deviation = rawMidi - previousMidi
    // > 0.5 semitones (50 cents) — must clearly cross the midpoint to switch notes
    midiNote = Math.abs(deviation) > 0.5 ? Math.round(rawMidi) : previousMidi
  } else {
    midiNote = Math.round(rawMidi)
  }

  const noteIndex = ((midiNote % 12) + 12) % 12
  const octave = Math.floor(midiNote / 12) - 1

  // Cents deviation from perfect pitch
  const perfectFrequency = 440 * Math.pow(2, (midiNote - 69) / 12)
  const cents = Math.round(1200 * Math.log2(hz / perfectFrequency))

  return {
    note: NOTE_NAMES[noteIndex],
    octave,
    cents,
    midiNote,
    frequency: hz,
  }
}

/**
 * Convert a note name and octave to its perfect frequency in Hz.
 * Uses A4 = 440 Hz as the reference pitch.
 */
export function noteToFrequency(note: NoteName, octave: number): number {
  const noteIndex = NOTE_NAMES.indexOf(note)
  const midiNote = (octave + 1) * 12 + noteIndex

  return 440 * Math.pow(2, (midiNote - 69) / 12)
}

/**
 * Convert a MIDI note number to its frequency in Hz.
 * Uses A4 = 440 Hz as the reference pitch.
 */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

/**
 * Convert a frequency in Hz to a note name string like "C4" or "F#3".
 * Returns null if frequency is invalid.
 */
export function frequencyToNoteName(hz: number): string | null {
  const info = frequencyToNote(hz)
  if (!info) return null

  return `${info.note}${info.octave}`
}

/* MIDI note number for C3 (middle-ish C in scientific pitch notation) */
const C3_MIDI = 48

const SOLFEGE_LABELS = ['DO', 'RE', 'MI', 'FA', 'SO', 'LA', 'TI', 'DO'] as const

/* Major scale intervals in semitones from root */
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11, 12]

type ScaleNote = {
  solfege: string
  note: NoteName
  octave: number
}

/**
 * Build a major scale (DO–DO) starting from the given MIDI root note.
 */
function buildMajorScale(rootMidiNote: number): ScaleNote[] {
  return MAJOR_SCALE_SEMITONES.map((semitone, i) => {
    const midi = rootMidiNote + semitone
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1

    return {
      solfege: SOLFEGE_LABELS[i],
      note: NOTE_NAMES[noteIndex],
      octave,
    }
  })
}

type StartToneOption = {
  offset: number
  label: string
  midiNote: number
}

const START_TONE_OPTIONS: StartToneOption[] = Array.from(
  { length: 25 },
  (_, i) => {
    const offset = 19 - i
    const midi = C3_MIDI + offset
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1
    const label = `${NOTE_NAMES[noteIndex]}${octave}`

    return { offset, label, midiNote: midi }
  },
)

type MidiNoteLabel = {
  note: NoteName
  octave: number
  label: string
}

/**
 * Convert a MIDI note number to its note name, octave, and display label.
 */
function midiToNoteLabel(midi: number): MidiNoteLabel {
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1
  const note = NOTE_NAMES[noteIndex]

  return { note, octave, label: `${note}${octave}` }
}

/**
 * Generate evenly-spaced notes across a MIDI range.
 * Returns ScaleNote[] suitable for playSequence().
 */
function midiRangeToScaleNotes(
  midiMin: number,
  midiMax: number,
  count = 5,
): ScaleNote[] {
  if (count < 2) return []

  const step = (midiMax - midiMin) / (count - 1)

  return Array.from({ length: count }, (_, i) => {
    const midi = Math.round(midiMin + i * step)
    const noteIndex = ((midi % 12) + 12) % 12
    const octave = Math.floor(midi / 12) - 1

    return {
      solfege: '',
      note: NOTE_NAMES[noteIndex],
      octave,
    }
  })
}

export {
  buildMajorScale,
  C3_MIDI,
  MAJOR_SCALE_SEMITONES,
  midiRangeToScaleNotes,
  midiToNoteLabel,
  NOTE_NAMES,
  START_TONE_OPTIONS,
}
export type { MidiNoteLabel, ScaleNote, StartToneOption }

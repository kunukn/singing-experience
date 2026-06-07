import type { VozMelody } from './graceKellyMelodies'

/* The sheet uses an 8vb treble clef (clef=treble-8), matching the source score:
 * every note sounds an octave lower than it is drawn. A note drawn at middle C
 * (ABC `C` = written MIDI 60) therefore sounds as C3 — which is midiOffset 0.
 * So midiOffset 0 maps to written MIDI 60 for display purposes. (Audio uses the
 * real sounding pitch via startToneMidi + offset; this base is display-only.) */
const ABC_WRITTEN_BASE = 60

/* ABC note name per semitone within an octave (0 = C, accidentals use ^ prefix). */
const SEMITONE_TO_ABC = [
  'C',
  '^C',
  'D',
  '^D',
  'E',
  'F',
  '^F',
  'G',
  '^G',
  'A',
  '^A',
  'B',
]

/* Converts an absolute MIDI note number to an ABC notation pitch string.
 * ABC octave convention: uppercase `C` = middle C (C4 / MIDI 60); `c` = C5;
 * `C,` = C3; lower octaves add commas, higher octaves add apostrophes. */
function midiToAbcPitch(midi: number): string {
  const semitone = ((midi % 12) + 12) % 12
  const name = SEMITONE_TO_ABC[semitone]

  if (midi >= 84) return name.toLowerCase() + "'" // C6+: lowercase + '
  if (midi >= 72) return name.toLowerCase() // C5–B5: lowercase
  if (midi >= 60) return name // C4–B4 (middle-C octave): uppercase
  if (midi >= 48) return name + ',' // C3–B3: uppercase + ,
  if (midi >= 36) return name + ',,' // C2–B2: uppercase + ,,
  return name + ',,,' // C1–B1: uppercase + ,,,
}

/* Returns a staffwidth that fits all notes on one line (prevents abcjs wrapping). */
export function estimateStaffWidth(noteCount: number): number {
  return Math.max(900, noteCount * 80)
}

/* Converts a VozMelody to an ABC notation string ready for abcjs.renderAbc.
 * The key is always C major (display stays fixed; audio transposes via startTone). */
export function vozMelodyToAbcString(
  melody: VozMelody,
  label: string,
  bpm = 120,
): string {
  /* 6/8 = 6 eighth notes per measure */
  const EIGHTHS_PER_MEASURE = 6

  /* 6/8 beats are dotted quarters = 3 eighth notes. ABC beams notes written
   * without a separating space; we beam consecutive eighth notes that fall in
   * the same beat and break the beam at beat boundaries, longer notes, and
   * barlines — the standard 6/8 engraving. */
  const BEAT_EIGHTHS = 3

  let body = ''
  let barPos = 0 // eighths elapsed in the current bar (note start position)
  /* The first bar's target is the anacrusis length (a pickup), if any; every
   * subsequent bar targets a full 6/8 measure. */
  let barTarget =
    melody.anacrusisEighths && melody.anacrusisEighths > 0
      ? melody.anacrusisEighths
      : EIGHTHS_PER_MEASURE
  let atBarStart = true
  let previousBeamable = false
  let previousBeat = -1

  for (const note of melody.notes) {
    const writtenMidi = ABC_WRITTEN_BASE + note.midiOffset
    const pitch = midiToAbcPitch(writtenMidi)
    /* L:1/8 means duration 1 = eighth note; omit "1" suffix per ABC spec */
    const duration = note.eighthNotes === 1 ? '' : String(note.eighthNotes)
    /* ABC tie "-" must directly follow the note, before any barline (C- | C) */
    const tie = note.tie ? '-' : ''

    const beat = Math.floor(barPos / BEAT_EIGHTHS)
    const beamable = note.eighthNotes === 1

    if (!atBarStart) {
      /* Join to the previous note (no space = beam) only when both are eighth
       * notes inside the same beat; otherwise separate them with a space. */
      const beam = beamable && previousBeamable && beat === previousBeat
      body += beam ? '' : ' '
    }

    body += pitch + duration + tie

    barPos += note.eighthNotes
    previousBeamable = beamable
    previousBeat = beat
    atBarStart = false

    if (barPos >= barTarget) {
      body += ' | '
      barPos = 0
      barTarget = EIGHTHS_PER_MEASURE
      atBarStart = true
    }
  }

  return [
    'X:1',
    `T:${label}`,
    'M:6/8',
    'L:1/8',
    `Q:3/8=${bpm}`,
    /* 8vb treble clef — notes sound an octave below where they are drawn,
     * matching the source score (Voz 4–6 are written treble-8vb). */
    'K:C clef=treble-8',
    body.trim(),
  ].join('\n')
}

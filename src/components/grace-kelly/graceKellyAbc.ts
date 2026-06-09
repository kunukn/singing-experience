import type { VozMelody } from './graceKellyMelodies'

/* The sheet notates each voice at its real sounding pitch, transposed by the
 * selected start tone. Most voices use an 8vb treble clef (clef=treble-8):
 * every note sounds an octave lower than it is drawn, so the written pitch is
 * the sounding pitch plus 12 — this keeps the low voices off ledger lines. The
 * high voices (Voz 1–3, melody.clef === 'treble') use a plain treble clef and
 * are drawn at true pitch (no "8"). Notes are stored as semitone offsets from
 * the tonic (start tone); since the melodies are fully diatonic, the whole part
 * lands in the start tone's major key, which we emit as a key signature — no
 * per-note accidentals needed. */

/* Tonic pitch class (0 = C) → major key signature + the key's tonic letter.
 * Black-key tonics use their conventional major spelling (Db/Eb/Ab/Bb, F#). */
const PITCHCLASS_TO_KEY: { abcKey: string; letter: string }[] = [
  { abcKey: 'C', letter: 'C' }, // 0
  { abcKey: 'Db', letter: 'D' }, // 1
  { abcKey: 'D', letter: 'D' }, // 2
  { abcKey: 'Eb', letter: 'E' }, // 3
  { abcKey: 'E', letter: 'E' }, // 4
  { abcKey: 'F', letter: 'F' }, // 5
  { abcKey: 'F#', letter: 'F' }, // 6
  { abcKey: 'G', letter: 'G' }, // 7
  { abcKey: 'Ab', letter: 'A' }, // 8
  { abcKey: 'A', letter: 'A' }, // 9
  { abcKey: 'Bb', letter: 'B' }, // 10
  { abcKey: 'B', letter: 'B' }, // 11
]

/* Semitone above the tonic → 0-based major-scale degree (do=0, re=1, … ti=6).
 * The melodies are diatonic, so every note's `midiOffset % 12` is one of these
 * keys. A chromatic offset would be absent here and must not be added without
 * first teaching this module to emit explicit accidentals. */
const MAJOR_DEGREE: Record<number, number> = {
  0: 0, // do
  2: 1, // re
  4: 2, // mi
  5: 3, // fa
  7: 4, // sol
  9: 5, // la
  11: 6, // ti
}

const DIATONIC_TO_LETTER = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
const LETTER_TO_DIATONIC: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
}
/* Natural (no-accidental) pitch class of each letter — used to anchor the
 * tonic's staff octave. */
const NAT: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
}

/* Converts a staff letter + scientific octave to an ABC pitch token.
 * ABC octave convention: uppercase `C` = middle C (C4); `c` = C5; `C,` = C3;
 * lower octaves add commas, higher octaves add apostrophes. */
function abcOctaveToken(letter: string, octave: number): string {
  if (octave >= 5) return letter.toLowerCase() + "'".repeat(octave - 5)

  return letter + ','.repeat(4 - octave)
}

/* Returns a staffwidth that fits all notes on one line (prevents abcjs wrapping). */
export function estimateStaffWidth(noteCount: number): number {
  return Math.max(900, noteCount * 80)
}

/* Formats a duration in eighth-note units (the L:1/8 unit) as an ABC length
 * token. Whole units render bare per the ABC spec (1 → '', 2 → '2', 3 → '3');
 * half units render as an x/2 fraction (1.5 → '3/2' dotted eighth, 0.5 → '1/2'
 * sixteenth). Only whole and half eighths occur in these transcriptions. */
function abcDurationToken(eighthNotes: number): string {
  /* Work in half-eighth units so 1.5 → 3 halves — integer math, no float compare. */
  const halves = Math.round(eighthNotes * 2)
  if (halves % 2 === 0) {
    const whole = halves / 2
    return whole === 1 ? '' : String(whole)
  }

  return `${halves}/2`
}

/* Converts a VozMelody to an ABC notation string ready for abcjs.renderAbc,
 * transposed so the tonic sounds at `startToneMidi`. The key signature is the
 * major key of the start tone; since the melody is diatonic, the note body
 * carries no accidentals. */
export function vozMelodyToAbcString(
  melody: VozMelody,
  label: string,
  startToneMidi: number,
  bpm = 120,
  showTempo = true,
  lyrics?: string,
): string {
  /* 6/8 = 6 eighth notes per measure */
  const EIGHTHS_PER_MEASURE = 6

  /* 6/8 beats are dotted quarters = 3 eighth notes. ABC beams notes written
   * without a separating space; we beam consecutive eighth notes that fall in
   * the same beat and break the beam at beat boundaries, longer notes, and
   * barlines — the standard 6/8 engraving. */
  const BEAT_EIGHTHS = 3

  const pitchClass = ((startToneMidi % 12) + 12) % 12
  const key = PITCHCLASS_TO_KEY[pitchClass]

  /* 'treble-8' (8vb) is the default; the high voices opt into a plain treble. */
  const useOctaveDownClef = melody.clef !== 'treble'
  const clefToken = useOctaveDownClef ? 'treble-8' : 'treble'

  /* An 8vb clef draws an octave above the sounding pitch, so the written tonic
   * is startTone + 12; a plain treble clef draws at true pitch. Anchor the tonic
   * onto the diatonic staff "ladder" (one step per letter) so each note's octave
   * marks follow from its scale degree. */
  const writtenTonicMidi = startToneMidi + (useOctaveDownClef ? 12 : 0)
  const tonicStaffOctave =
    Math.round((writtenTonicMidi - NAT[key.letter]) / 12) - 1
  const tonicLadder = tonicStaffOctave * 7 + LETTER_TO_DIATONIC[key.letter]

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
    const within = ((note.midiOffset % 12) + 12) % 12
    const degree = MAJOR_DEGREE[within]
    if (degree === undefined) {
      debugLog(
        `[graceKelly] non-diatonic midiOffset ${note.midiOffset} cannot be spelled in a key signature`,
      )
    }
    const ladder =
      tonicLadder + Math.floor(note.midiOffset / 12) * 7 + (degree ?? 0)
    const staffOctave = Math.floor(ladder / 7)
    const letter = DIATONIC_TO_LETTER[((ladder % 7) + 7) % 7]
    const pitch = abcOctaveToken(letter, staffOctave)
    const duration = abcDurationToken(note.eighthNotes)
    /* ABC tie "-" must directly follow the note, before any barline (C- | C) */
    const tie = note.tie ? '-' : ''

    const beat = Math.floor(barPos / BEAT_EIGHTHS)
    /* Only a plain eighth beams; longer or dotted notes (eighthNotes !== 1) carry
     * their own flag and break the beam. */
    const beamable = note.eighthNotes === 1

    if (!atBarStart) {
      /* Join to the previous note (no space = beam) only when both are eighth
       * notes inside the same beat; otherwise separate them with a space. */
      const beam = beamable && previousBeamable && beat === previousBeat
      body += beam ? '' : ' '
    }

    body += pitch + duration + tie

    /* A clipped note (restAfterEighths) is drawn as the note followed by a rest
     * that fills the remaining time — e.g. a dotted-eighth note + a sixteenth
     * rest. The rest is notation + scheduled silence only; it adds no entry to
     * melody.notes, so note indexing and lyric alignment are unaffected. */
    if (note.restAfterEighths && note.restAfterEighths > 0) {
      body += ' z' + abcDurationToken(note.restAfterEighths)
    }

    barPos += note.eighthNotes + (note.restAfterEighths ?? 0)
    /* A trailing rest breaks the beam — the next note can't beam back across it. */
    previousBeamable = beamable && !note.restAfterEighths
    previousBeat = beat
    atBarStart = false

    if (barPos >= barTarget) {
      body += ' | '
      barPos = 0
      barTarget = EIGHTHS_PER_MEASURE
      atBarStart = true
    }
  }

  /* Append visual-only trailing rests to balance the closing bar against the
   * pickup. These live in the ABC only (never in melody.notes), so the players
   * schedule no trailing silence — purely a notational nicety. A bare `z` is an
   * eighth rest under L:1/8, so N eighth rests render as `z z …`. */
  if (melody.trailingRestEighths && melody.trailingRestEighths > 0) {
    const rests = Array.from({ length: melody.trailingRestEighths }, () => 'z')
    body += (body.endsWith(' ') ? '' : ' ') + rests.join(' ')
  }

  return [
    'X:1',
    `T:${label}`,
    'M:6/8',
    'L:1/8',
    /* Tempo marking is optional — some sheets render without the BPM header. */
    ...(showTempo ? [`Q:3/8=${bpm}`] : []),
    /* Treble clef — 8vb for the low voices (notes sound an octave below where
     * drawn, matching the source score), plain treble for the high voices. The
     * key signature is the start tone's major key, so the diatonic melody needs
     * no per-note accidentals. */
    `K:${key.abcKey} clef=${clefToken}`,
    body.trim(),
    /* A `w:` line after the music aligns each space-separated syllable to a
     * note, drawing the lyrics under the staff. Omitted when no lyrics given. */
    ...(lyrics ? [`w:${lyrics}`] : []),
  ].join('\n')
}

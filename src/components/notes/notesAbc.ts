import type { ClefKey } from './notesConstants'

/* Chromatic pitch class (0 = C) → ABC note token (accidental + natural letter).
 * The five black keys are spelled as sharps (the C-major-ascending convention
 * the page uses); each borrows the natural letter directly below it, which never
 * crosses an octave boundary, so the note's own octave math stays correct. */
const PITCHCLASS_TO_ABC: { accidental: string; letter: string }[] = [
  { accidental: '', letter: 'C' }, // 0  C
  { accidental: '^', letter: 'C' }, // 1  C#
  { accidental: '', letter: 'D' }, // 2  D
  { accidental: '^', letter: 'D' }, // 3  D#
  { accidental: '', letter: 'E' }, // 4  E
  { accidental: '', letter: 'F' }, // 5  F
  { accidental: '^', letter: 'F' }, // 6  F#
  { accidental: '', letter: 'G' }, // 7  G
  { accidental: '^', letter: 'G' }, // 8  G#
  { accidental: '', letter: 'A' }, // 9  A
  { accidental: '^', letter: 'A' }, // 10 A#
  { accidental: '', letter: 'B' }, // 11 B
]

/* Eighth notes per 4/4 measure (the player notates every note as an eighth, so
 * a bar holds 8 of them). */
const NOTES_PER_MEASURE = 8

/* Eighths beam in groups of 4 — two beam-groups per 4/4 bar. */
const NOTES_PER_BEAM = 4

/* Converts a staff letter + scientific octave to an ABC octave token.
 * ABC octave convention: uppercase `C` = middle C (C4); `c` = C5; `C,` = C3;
 * lower octaves add commas, higher octaves add apostrophes. */
function abcOctaveToken(letter: string, octave: number): string {
  if (octave >= 5) return letter.toLowerCase() + "'".repeat(octave - 5)

  return letter + ','.repeat(4 - octave)
}

/* ABC token for an absolute MIDI note, spelled with sharps. */
function midiToAbcToken(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12
  const { accidental, letter } = PITCHCLASS_TO_ABC[pitchClass]
  /* MIDI octave: C-1 = MIDI 0, so the scientific octave is floor(midi/12) - 1. */
  const octave = Math.floor(midi / 12) - 1

  return accidental + abcOctaveToken(letter, octave)
}

/* Returns a staffwidth that fits all notes on one line (prevents abcjs wrapping). */
export function estimateNotesStaffWidth(noteCount: number): number {
  return Math.max(900, noteCount * 80)
}

/*
 * Builds the ABC note body for one absolute-MIDI chromatic scale: one eighth note
 * per pitch (8 per 4/4 bar), sharps carrying an explicit `^`. Because the scale
 * ascends one semitone at a time, no natural-after-sharp ever lands on the same
 * letter within a bar, so no explicit naturals (`=`) are needed. The final
 * partial measure is padded with eighth rests to complete the 4/4 bar. Eighths
 * beam in groups of NOTES_PER_BEAM; ` | ` separates bars, ending on a final
 * barline. Returned alone (no header) so it can serve a single- or multi-voice
 * tune.
 */
function midisToAbcBody(midis: number[]): string {
  const tokens = midis.map(midiToAbcToken)

  /* Pad the last bar with eighth rests so the closing measure fills 4/4. */
  const remainder = tokens.length % NOTES_PER_MEASURE
  if (remainder > 0) {
    for (let index = remainder; index < NOTES_PER_MEASURE; index++) {
      tokens.push('z')
    }
  }

  const bars: string[] = []
  for (let index = 0; index < tokens.length; index += NOTES_PER_MEASURE) {
    const barTokens = tokens.slice(index, index + NOTES_PER_MEASURE)
    const beamGroups: string[] = []
    for (let start = 0; start < barTokens.length; start += NOTES_PER_BEAM) {
      beamGroups.push(barTokens.slice(start, start + NOTES_PER_BEAM).join(''))
    }
    bars.push(beamGroups.join(' '))
  }

  return bars.join(' | ') + ' |]'
}

/*
 * Converts an absolute-MIDI chromatic scale to an ABC notation string ready for
 * abcjs.renderAbc: 4/4, one eighth note per pitch (8 per bar), key of C major.
 */
export function noteScaleToAbcString(
  midis: number[],
  clef: ClefKey,
  bpm = 80,
  showTempo = true,
): string {
  return [
    'X:1',
    /* %%stretchlast 0 — never stretch the final staff line to fill the staff
     * width. Because the padded final bar makes the line "complete", abcjs would
     * otherwise justify the notes across the full probed width, which defeats the
     * sheet's measure-and-shrink pass and leaves a wide trail of empty staff. */
    '%%stretchlast 0',
    'M:4/4',
    'L:1/8',
    ...(showTempo ? [`Q:1/4=${bpm}`] : []),
    `K:C clef=${clef}`,
    midisToAbcBody(midis),
  ].join('\n')
}

/*
 * Combined two-voice tune: treble scale as V:1, bass scale as V:2 in a single
 * abcjs system. abcjs aligns barlines and beats vertically across the two voices,
 * so every bar renders the same width on both staves (true symmetry) — unlike two
 * independently-rendered sheets, whose bars drift apart by their differing
 * accidental counts and trailing rests. The voices are left ungrouped (no
 * `%%score`) so abcjs honours `%%staffsep` for a wide gap between the staves and
 * draws no connecting brace — they read as two independent reference scales.
 * Voices in a single tune align horizontally regardless of grouping.
 */
export function noteScalesToTwoVoiceAbcString(
  trebleMidis: number[],
  bassMidis: number[],
  bpm = 80,
  showTempo = true,
): string {
  return [
    'X:1',
    '%%stretchlast 0',
    /* Wide gap between the two staves so the bass staff's note-name chips (drawn
     * ~40px above its noteheads) clear the treble staff sitting above them. */
    '%%staffsep 120',
    'M:4/4',
    'L:1/8',
    ...(showTempo ? [`Q:1/4=${bpm}`] : []),
    'K:C',
    'V:1 clef=treble',
    midisToAbcBody(trebleMidis),
    'V:2 clef=bass',
    midisToAbcBody(bassMidis),
  ].join('\n')
}

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

/* Quarter notes per 4/4 measure (the player notates every note as a quarter). */
const BEATS_PER_MEASURE = 4

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
 * Converts an absolute-MIDI chromatic scale to an ABC notation string ready for
 * abcjs.renderAbc: 4/4, one quarter note per pitch, key of C major. Sharps carry
 * an explicit `^` accidental (C major has none in the key signature). Because the
 * scale ascends one semitone at a time, no natural-after-sharp ever lands on the
 * same letter within a bar, so no explicit naturals (`=`) are needed. The final
 * partial measure is padded with quarter rests to complete the 4/4 bar.
 */
export function noteScaleToAbcString(
  midis: number[],
  clef: ClefKey,
  bpm = 80,
  showTempo = true,
): string {
  const tokens = midis.map(midiToAbcToken)

  /* Pad the last bar with quarter rests so the closing measure fills 4/4. */
  const remainder = tokens.length % BEATS_PER_MEASURE
  if (remainder > 0) {
    for (let index = remainder; index < BEATS_PER_MEASURE; index++) {
      tokens.push('z')
    }
  }

  /* One bar per BEATS_PER_MEASURE tokens; quarters never beam, so a plain space
   * separates them and ` | ` separates the bars, ending on a final barline. */
  const bars: string[] = []
  for (let index = 0; index < tokens.length; index += BEATS_PER_MEASURE) {
    bars.push(tokens.slice(index, index + BEATS_PER_MEASURE).join(' '))
  }
  const body = bars.join(' | ') + ' |]'

  return [
    'X:1',
    /* %%stretchlast 0 — never stretch the final staff line to fill the staff
     * width. Because the padded final bar makes the line "complete", abcjs would
     * otherwise justify the notes across the full probed width, which defeats the
     * sheet's measure-and-shrink pass and leaves a wide trail of empty staff. */
    '%%stretchlast 0',
    'M:4/4',
    'L:1/4',
    ...(showTempo ? [`Q:1/4=${bpm}`] : []),
    `K:C clef=${clef}`,
    body,
  ].join('\n')
}

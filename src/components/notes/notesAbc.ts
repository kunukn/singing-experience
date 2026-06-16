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

/* Quarter notes per 4/4 measure — the sheets notate every note as a quarter, so
 * a bar holds 4 of them. Quarters draw a clean filled head (no flags); the
 * sheets hide the stems via CSS so the staff reads as plain position dots. */
const NOTES_PER_MEASURE = 4

/* One note per "beam group" — quarters never beam, so each token stands alone
 * (space-separated) and no beam line is drawn between notes. */
const NOTES_PER_BEAM = 1

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
 * Builds the ABC note body for one absolute-MIDI chromatic scale: one quarter note
 * per pitch (4 per 4/4 bar), sharps carrying an explicit `^`. Because the scale
 * ascends one semitone at a time, no natural-after-sharp ever lands on the same
 * letter within a bar, so no explicit naturals (`=`) are needed. The final
 * partial measure is padded with quarter rests to complete the 4/4 bar. Notes are
 * unbeamed (quarters don't beam); ` | ` separates bars, ending on a final
 * barline. Returned alone (no header) so it can serve a single- or multi-voice
 * tune.
 */
/* Group ABC tokens into 4/4 bars (NOTES_PER_MEASURE per bar). With NOTES_PER_BEAM
 * of 1 every token is space-separated, so abcjs beams nothing — a clean row of
 * quarter-note heads. Tokens may be notes or rests. */
function beamTokensIntoBars(tokens: string[]): string[] {
  const bars: string[] = []
  for (let index = 0; index < tokens.length; index += NOTES_PER_MEASURE) {
    const barTokens = tokens.slice(index, index + NOTES_PER_MEASURE)
    const beamGroups: string[] = []
    for (let start = 0; start < barTokens.length; start += NOTES_PER_BEAM) {
      beamGroups.push(barTokens.slice(start, start + NOTES_PER_BEAM).join(''))
    }
    bars.push(beamGroups.join(' '))
  }

  return bars
}

/* Rest token used to pad the final bar to a full 4/4. `z` is a visible rest;
 * `x` is an invisible rest — same duration (so barlines stay aligned) but draws
 * no glyph, used where trailing rests would be visual noise. */
function buildBeamedBars(
  midis: number[],
  padLastBar = true,
  restToken: 'z' | 'x' = 'z',
): string[] {
  const tokens = midis.map(midiToAbcToken)

  /* Pad the last bar with quarter rests so the closing measure fills 4/4. */
  if (padLastBar) {
    const remainder = tokens.length % NOTES_PER_MEASURE
    if (remainder > 0) {
      for (let index = remainder; index < NOTES_PER_MEASURE; index++) {
        tokens.push(restToken)
      }
    }
  }

  return beamTokensIntoBars(tokens)
}

function midisToAbcBody(
  midis: number[],
  restToken: 'z' | 'x' = 'z',
  padLastBar = true,
): string {
  return buildBeamedBars(midis, padLastBar, restToken).join(' | ') + ' |]'
}

/* One voice's body, grouped into bars and padded at the trailing end with invisible
 * `x` rests up to `targetNoteCount` (no full-measure padding). Sibling voices padded
 * to the same target end at the same x, so abcjs draws one aligned final barline
 * across the staves — without the trailing dead space a full padded bar leaves.
 * `x` keeps the quarter-note duration (alignment) but draws no glyph. */
function voiceBodyToTarget(midis: number[], targetNoteCount: number): string {
  const trailingRests = Math.max(0, targetNoteCount - midis.length)
  const tokens = [
    ...midis.map(midiToAbcToken),
    ...Array<string>(trailingRests).fill('x'),
  ]

  return beamTokensIntoBars(tokens).join(' | ') + ' |]'
}

/*
 * Converts an absolute-MIDI chromatic scale to an ABC notation string ready for
 * abcjs.renderAbc: 4/4, one quarter note per pitch (4 per bar), key of C major.
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
     * width, so abcjs can't justify the notes across the full probed width and
     * leave a wide trail of empty staff. The partial final bar already keeps the
     * line "incomplete" (abcjs won't stretch it), but this guards every render. */
    '%%stretchlast 0',
    'M:4/4',
    'L:1/4',
    ...(showTempo ? [`Q:1/4=${bpm}`] : []),
    `K:C clef=${clef}`,
    /* Don't pad the final bar — this sheet shows only the notes (tempo/duration
     * don't matter here), so a partial closing measure is fine and avoids the
     * trailing dead space a full padded bar would leave. restToken is moot when
     * padLastBar is false. */
    midisToAbcBody(midis, 'z', false),
  ].join('\n')
}

/*
 * One voice's outlier body: a low cluster and a high cluster of noteheads,
 * separated by a single barline (no visual gap). Each cluster is padded at its
 * trailing end with invisible `x` rests up to its target count (`lowTarget` /
 * `highTarget` — the longer voice's count for that cluster). Padding the two
 * clusters independently keeps the per-measure slot counts identical across the
 * two staves, so treble and bass bars render the same width and their barlines —
 * including the final one — align. `x` keeps the duration (alignment) but draws
 * no glyph. Barlines/rests carry no `.abcjs-note` class, so the label index
 * mapping over `.abcjs-note` stays aligned with [...low, ...high].
 */
function outlierVoiceBody(
  lowMidis: number[],
  highMidis: number[],
  lowTarget: number,
  highTarget: number,
): string {
  const lowTokens = [
    ...lowMidis.map(midiToAbcToken),
    ...Array<string>(Math.max(0, lowTarget - lowMidis.length)).fill('x'),
  ]
  const highTokens = [
    ...highMidis.map(midiToAbcToken),
    ...Array<string>(Math.max(0, highTarget - highMidis.length)).fill('x'),
  ]

  return (
    [
      beamTokensIntoBars(lowTokens).join(' | '),
      beamTokensIntoBars(highTokens).join(' | '),
    ].join(' | ') + ' |]'
  )
}

/*
 * Combined two-voice outlier tune: treble outliers as V:1 over bass outliers as
 * V:2 in a single abcjs system, mirroring noteScalesToTwoVoiceAbcString so the two
 * staves render in one grand-staff-style container. The low and high clusters are
 * each padded to the longer voice's count for that cluster (with invisible rests),
 * so both staves share the same per-measure slot counts — equal bar widths and an
 * aligned connecting final barline across both staves.
 */
export function outlierScalesToTwoVoiceAbcString(
  trebleLowMidis: number[],
  trebleHighMidis: number[],
  bassLowMidis: number[],
  bassHighMidis: number[],
): string {
  const lowTarget = Math.max(trebleLowMidis.length, bassLowMidis.length)
  const highTarget = Math.max(trebleHighMidis.length, bassHighMidis.length)

  return [
    'X:1',
    '%%stretchlast 0',
    /* Wide gap between the two staves so the bass staff's note-name chips (drawn
     * ~40px above its noteheads) clear the treble staff sitting above them. */
    '%%staffsep 120',
    'M:4/4',
    'L:1/4',
    'K:C',
    'V:1 clef=treble',
    outlierVoiceBody(trebleLowMidis, trebleHighMidis, lowTarget, highTarget),
    'V:2 clef=bass',
    outlierVoiceBody(bassLowMidis, bassHighMidis, lowTarget, highTarget),
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
  const targetNoteCount = Math.max(trebleMidis.length, bassMidis.length)

  return [
    'X:1',
    '%%stretchlast 0',
    /* Wide gap between the two staves so the bass staff's note-name chips (drawn
     * ~40px above its noteheads) clear the treble staff sitting above them. */
    '%%staffsep 120',
    'M:4/4',
    'L:1/4',
    ...(showTempo ? [`Q:1/4=${bpm}`] : []),
    'K:C',
    /* Pad both voices to the longer one's length with invisible rests (not to a
     * full bar) — their closing barline stays aligned while the shorter voice
     * shows only the notes, with no trailing dead space. */
    'V:1 clef=treble',
    voiceBodyToTarget(trebleMidis, targetNoteCount),
    'V:2 clef=bass',
    voiceBodyToTarget(bassMidis, targetNoteCount),
  ].join('\n')
}

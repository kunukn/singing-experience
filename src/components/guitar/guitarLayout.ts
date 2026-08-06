/*
 * The open strings a board is built from come in as a MIDI array from
 * @/utils/guitarTunings — string 6 (the lowest) first, so index 0 is the leftmost
 * column. The board is drawn looking at the front of the neck, low pitch on the
 * left like the piano.
 */

/* Every supported tuning has six strings, so this stays a constant. */
export const GUITAR_STRING_COUNT = 6

/* Rows 0…15 inclusive — fret 0 is the open string. */
export const GUITAR_MAX_FRET = 15
export const GUITAR_FRET_ROW_COUNT = GUITAR_MAX_FRET + 1

/*
 * px — one semitone per row, the same height everywhere. A real neck spaces
 * frets logarithmically; this board does not, so the live-pitch highlight
 * travels at a constant px-per-cent exactly as it does across the piano keys.
 */
export const FRET_ROW_HEIGHT = 30

/* px — the 0…15 number column at the inline-start edge of the board. */
export const FRET_NUMBER_GUTTER = 28

/* px — on touch the fret-number column doubles as the strip you grab to pan the
 * board, since it is the only full-height area with no fret cells in it. 44 is
 * the Apple HIG minimum tap target, the same value and reasoning as the piano's
 * PIANO_DRAG_GUTTER_HEIGHT; narrower and it is too easy to miss and hit a fret. */
export const FRET_NUMBER_GUTTER_TOUCH = 44

export const MAX_STRING_WIDTH = 60 // px
export const MIN_STRING_WIDTH_TOUCH = 44 // px — tap-target floor
export const MIN_STRING_WIDTH_POINTER = 36 // px

/* Inlays as on a real neck; 12 takes the double dot marking the octave. */
export const SINGLE_INLAY_FRETS = [3, 5, 7, 9, 15]
export const DOUBLE_INLAY_FRET = 12

export type GuitarCell = {
  stringIndex: number
  fret: number
  midi: number
  leftPx: number
  topPx: number
}

export type GuitarLayout = {
  stringWidth: number
  boardWidth: number
  boardHeight: number
  cells: GuitarCell[]
}

/** Sounding pitch of a fret. Fret 0 is the open string. */
export function guitarFretMidi(
  tuning: readonly number[],
  stringIndex: number,
  fret: number,
): number {
  return tuning[stringIndex] + fret
}

/*
 * The board's pitch span, derived rather than written by hand so the range the
 * duet band split and the live-pitch preview use cannot fall out of step with the
 * board — including when the tuning changes under them.
 */
export function guitarMidiMin(tuning: readonly number[]): number {
  return Math.min(...tuning)
}

export function guitarMidiMax(tuning: readonly number[]): number {
  return Math.max(...tuning) + GUITAR_MAX_FRET
}

/**
 * Vertical centre of a fret position, in px from the top of the board.
 *
 * Takes a FRACTIONAL position so the live-pitch segment can sit between two
 * rows: 3.0 is dead centre of fret 3, 3.5 sits on the wire below it.
 */
export function guitarFretY(fretPosition: number): number {
  return (fretPosition + 0.5) * FRET_ROW_HEIGHT
}

/*
 * Every cell of the board, built once per width change rather than once per
 * render — 6 strings × 16 frets is 96 of them.
 */
export function buildGuitarLayout(
  stringWidth: number,
  tuning: readonly number[],
): GuitarLayout {
  const cells: GuitarCell[] = []

  for (let stringIndex = 0; stringIndex < GUITAR_STRING_COUNT; stringIndex++) {
    for (let fret = 0; fret <= GUITAR_MAX_FRET; fret++) {
      cells.push({
        stringIndex,
        fret,
        midi: guitarFretMidi(tuning, stringIndex, fret),
        leftPx: stringIndex * stringWidth,
        topPx: fret * FRET_ROW_HEIGHT,
      })
    }
  }

  return {
    stringWidth,
    boardWidth: GUITAR_STRING_COUNT * stringWidth,
    boardHeight: GUITAR_FRET_ROW_COUNT * FRET_ROW_HEIGHT,
    cells,
  }
}

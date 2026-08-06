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
 *
 * This is the BASE (and minimum) row height. On a tall desktop the board grows
 * the rows toward MAX_FRET_ROW_HEIGHT so the note names can be read at a normal
 * distance — see buildGuitarBoardScale. Every row is still the same height at
 * any given moment, which is what the constant px-per-cent claim depends on;
 * only the value shared by all of them moves.
 */
export const FRET_ROW_HEIGHT = 30

/*
 * px — the ceiling on that growth. 16 rows at 46px is a 736px board, which still
 * clears the ~240px of chrome above and below it on a 1080px-tall window without
 * making the page scroll; shorter windows never reach the ceiling anyway, since
 * the row height is fitted to the space available first.
 */
export const MAX_FRET_ROW_HEIGHT = 46

/* px — the 0…15 number column at the inline-start edge of the board. */
export const FRET_NUMBER_GUTTER = 28

/* px — on touch the fret-number column doubles as the strip you grab to pan the
 * board, since it is the only full-height area with no fret cells in it. 44 is
 * the Apple HIG minimum tap target, the same value and reasoning as the piano's
 * PIANO_DRAG_GUTTER_HEIGHT; narrower and it is too easy to miss and hit a fret. */
export const FRET_NUMBER_GUTTER_TOUCH = 44

/* px — wide enough to give a three-character name (C♯3) and its scale dot room
 * at the largest row height, while keeping the six columns close enough together
 * to still read as a neck rather than a spreadsheet. */
export const MAX_STRING_WIDTH = 72
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
  rowHeight: number
  boardWidth: number
  boardHeight: number
  cells: GuitarCell[]
}

/*
 * Every size on the board that has to move together when the rows grow. Derived
 * from one number so they cannot drift apart: a ring that outgrew its row, or a
 * name too big for the dot behind it, is the whole failure mode here.
 */
export type GuitarBoardScale = {
  rowHeight: number
  labelFontSize: number
  scaleDotSize: number
  fretRingSize: number
  /* Fret numbers and string numbers, which would look stranded beside a note
   * name half again their size. */
  gutterFontSize: number
}

/*
 * px — everything above and below the board that a taller board would have to
 * push off screen: the top bar, the two control rows, the preview chip band and
 * the string-number header, plus the page's bottom padding. Measured from the
 * live page rather than summed from the stylesheets, so it already accounts for
 * the gaps between them.
 */
const BOARD_VERTICAL_CHROME = 241

/*
 * px — the hover/focus ring is painted as a box-shadow spread, which renders
 * OUTSIDE the element's box: its visible edge sits this far beyond fretRingSize
 * on every side. Leaving it out of the clearance below is what used to land the
 * ring on top of the fret wire. Keep in step with the spread in GuitarDisplay's
 * scoped CSS.
 */
export const FRET_RING_SHADOW_WIDTH = 2

/* px — a fret wire is drawn along the top edge of every fretted cell, so the
 * ring has to start below it rather than under it. */
export const FRET_WIRE_HEIGHT = 1

/*
 * px — the nut is thicker than a fret wire, as on a real neck, and it lands on
 * the top edge of row 1. That makes it the worst case the ring has to clear:
 * the ring is centred in its cell, so every row is sized for the thickest thing
 * any row has above it, not the 1px hairline most of them get.
 */
export const NUT_HEIGHT = 3

/*
 * px — how far the nut actually reaches into the row below it. Wires are centred
 * on their fret boundary (see guitarFretWireTop), so only the lower half lands in
 * the next row, rounded up because the top is floored to a whole pixel.
 */
export const NUT_OVERHANG = Math.ceil(NUT_HEIGHT / 2)

/* px — visible gap left between the wire and the ring's outer edge, so the two
 * read as separate marks instead of one thick smudge. */
const FRET_RING_CLEARANCE = 2

/*
 * The share of the window the board's own scroll box takes on touch. Mirrors
 * BOARD_MAX_VIEWPORT_HEIGHT ('70svh') in GuitarDisplay — keep the two in step.
 *
 * Read off window.innerHeight rather than svh, which CSS alone knows: innerHeight
 * follows the LARGE viewport once the address bar collapses, so 0.7 × it can
 * overshoot the box the board actually sits in. Sizing off the smaller of this
 * and the page-chrome fit is what keeps that overshoot from mattering.
 */
const BOARD_TOUCH_VIEWPORT_RATIO = 0.7

/**
 * Size the board to the window.
 *
 * Only the height is consulted. The width axis already flexes on its own (see
 * the stringWidth computed in GuitarDisplay), and on a desktop it has room to
 * spare — it is vertical space that decides whether the whole neck is visible
 * without scrolling the page.
 *
 * Touch grows the same way, with one extra bound: the board sits in its own
 * 70svh scroll box there, so the rows may only grow as far as that box can still
 * show all sixteen at once. A tablet clears both tests easily and lands on the
 * same rows a desktop draws — 16 × 30px inside an 826px box left a third of it
 * empty. A phone is held back by whichever bound bites first, and a short one
 * stays on the base row and scrolls, exactly as before.
 */
export function buildGuitarBoardScale(
  viewportHeight: number,
  isCoarsePointer: boolean,
): GuitarBoardScale {
  const available = isCoarsePointer
    ? Math.min(
        viewportHeight - BOARD_VERTICAL_CHROME,
        viewportHeight * BOARD_TOUCH_VIEWPORT_RATIO,
      )
    : viewportHeight - BOARD_VERTICAL_CHROME
  const fitted = Math.floor(available / GUITAR_FRET_ROW_COUNT)
  const rowHeight = Math.min(
    Math.max(fitted, FRET_ROW_HEIGHT),
    MAX_FRET_ROW_HEIGHT,
  )

  /*
   * Reserve the same band at the top and bottom of the row — the ring is
   * centred, so it is bounded by whichever edge is tighter — made up of the wire
   * above it (the nut, at its thickest), the gap left beside that, and the
   * shadow the ring paints outside its own box.
   */
  const fretRingSize =
    rowHeight -
    2 * (NUT_OVERHANG + FRET_RING_CLEARANCE + FRET_RING_SHADOW_WIDTH)

  return {
    rowHeight,
    fretRingSize,
    /* The ring's visible band is the shadow it casts beyond fretRingSize, so a
     * dot that stops just inside the ring still leaves the whole band showing on
     * a tinted cell — and stays as large as it can for the name it backs. */
    scaleDotSize: fretRingSize - 2,
    /* Capped at 14: past that a three-character name outgrows its dot, and the
     * board reads as text with circles behind it rather than as a fretboard. */
    labelFontSize: Math.min(Math.max(Math.round(rowHeight * 0.38), 11), 14),
    /* Deliberately well under labelFontSize rather than a step below it: the
     * gutter numbers are orientation only, and at 12 vs 14 they competed with
     * the note names for the eye. */
    gutterFontSize: Math.min(Math.max(Math.round(rowHeight * 0.3), 9), 11),
  }
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
 *
 * rowHeight defaults to the base size so callers that do not resize (and the
 * tests) can keep asking in the board's own units.
 */
export function guitarFretY(
  fretPosition: number,
  rowHeight: number = FRET_ROW_HEIGHT,
): number {
  return (fretPosition + 0.5) * rowHeight
}

/*
 * Every cell of the board, built once per width change rather than once per
 * render — 6 strings × 16 frets is 96 of them.
 */
export function buildGuitarLayout(
  stringWidth: number,
  tuning: readonly number[],
  rowHeight: number = FRET_ROW_HEIGHT,
): GuitarLayout {
  const cells: GuitarCell[] = []

  for (let stringIndex = 0; stringIndex < GUITAR_STRING_COUNT; stringIndex++) {
    for (let fret = 0; fret <= GUITAR_MAX_FRET; fret++) {
      cells.push({
        stringIndex,
        fret,
        midi: guitarFretMidi(tuning, stringIndex, fret),
        leftPx: stringIndex * stringWidth,
        topPx: fret * rowHeight,
      })
    }
  }

  return {
    stringWidth,
    rowHeight,
    boardWidth: GUITAR_STRING_COUNT * stringWidth,
    boardHeight: GUITAR_FRET_ROW_COUNT * rowHeight,
    cells,
  }
}

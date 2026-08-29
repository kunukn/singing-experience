/*
 * The open strings a board is built from come in as a MIDI array from
 * @/utils/guitarTunings — string 6 (the lowest) first, so index 0 is the leftmost
 * column. The board is drawn looking at the front of the neck, low pitch on the
 * left like the piano.
 */

/* Every supported tuning has six strings, so this stays a constant. */
export const GUITAR_STRING_COUNT = 6

/*
 * Rows 0…22 inclusive — fret 0 is the open string.
 *
 * 22 because that is what is under a player's hand: it covers essentially every
 * current production electric, where 19 stopped three frets short of the neck
 * they are holding. It carries the 21st inlay too, so the fingerboard ends
 * where a real one does rather than mid-position.
 *
 * Three more rows than 19 cost real height — see MAX_FRET_ROW_HEIGHT — and are
 * affordable only because the board scrolls inside its own bounded box. Before
 * that, three more rows meant three more rows of page overflow.
 */
export const GUITAR_MAX_FRET = 22
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
 * px — the ceiling on that growth. A legibility cap, NOT a promise that the
 * board fits: past this the rows are as tall as the note names can use, and
 * whether the whole neck is visible is decided by the fitted-first step below.
 *
 * 23 rows at 46px is a 1058px board, so the ceiling is only reachable on a
 * window of ~1325px or taller (1058 + BOARD_VERTICAL_CHROME) — a tall monitor,
 * not a laptop. A 1080px window fits its rows to 35px instead.
 *
 * That is a real loss of whitespace against the 20-row board, which reached
 * 41px there, and it was accepted rather than answered by raising this number:
 * the cap exists because past ~46px a three-character name like C♯3 outgrows
 * the scale dot behind it, and labelFontSize is clamped to 11–14px anyway, so
 * shorter rows cost air rather than readability.
 */
export const MAX_FRET_ROW_HEIGHT = 46

/* px — the 0…22 number column at the inline-start edge of the board. Two digits
 * still fit: the gutter font is capped well below the note names. */
export const FRET_NUMBER_GUTTER = 28

/*
 * px — the same column, wider on touch. For legibility, not as a tap target:
 * nothing in it is tappable. A phone draws these two-digit numbers at the
 * gutter font's floor, at arm's length, beside a neck that is itself only just
 * wide enough — 28px leaves them cramped against the low E string.
 *
 * It is NOT the piano's PIANO_DRAG_GUTTER_HEIGHT, which this once copied. That
 * strip is a place to start a pan that is not a key, because a piano key sounds
 * on pointerdown. A fret sounds on click, which no scroll gesture fires, so a
 * pan can start anywhere on the neck and the guitar needs no such handle.
 */
export const FRET_NUMBER_GUTTER_TOUCH = 44

/* px — wide enough to give a three-character name (C♯3) and its scale dot room
 * at the largest row height, while keeping the six columns close enough together
 * to still read as a neck rather than a spreadsheet. */
export const MAX_STRING_WIDTH = 72
export const MIN_STRING_WIDTH_TOUCH = 44 // px — tap-target floor
export const MIN_STRING_WIDTH_POINTER = 36 // px

/* Inlays as on a real neck; 12 takes the double dot marking the octave. 17, 19
 * and 21 are the upper markers the extra frets brought onto the board. 22 is
 * deliberately absent — a real neck leaves its last fret unmarked. */
export const SINGLE_INLAY_FRETS = [3, 5, 7, 9, 15, 17, 19, 21]
export const DOUBLE_INLAY_FRET = 12

/*
 * Every fret a player navigates by. The face inlays mark exactly these, and so
 * do the side dots along the neck edge and the emphasised fret numbers — three
 * views of one fact, so they read off one list rather than three copies that
 * can drift apart.
 */
const MARKER_FRETS = new Set([...SINGLE_INLAY_FRETS, DOUBLE_INLAY_FRET])

export function isGuitarMarkerFret(fret: number): boolean {
  return MARKER_FRETS.has(fret)
}

/*
 * px — the headstock band above the nut, carrying one tuning peg per string.
 *
 * Orientation, not information: it names which end of the board is the nut, so
 * the neck reads as an instrument rather than a table that happens to start at
 * fret 0. Kept shallow deliberately — it is the one part of the board that
 * shows no pitch, so every px it takes is a px the frets do not get.
 *
 * Drawn INSIDE the board's scroll box: it is fastened to fret 0, so pinning it
 * while the neck scrolled under it joined the pegs to whatever fret happened to
 * be at the top. It scrolls away instead, and hands its height to the frets
 * once you are past it.
 */
export const HEADSTOCK_HEIGHT = 26

/* px — the peg circles on that band, and the gap holding them off the nut. */
export const HEADSTOCK_PEG_SIZE = 9

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
 *
 * A FIRST-RENDER FALLBACK, not the truth. It is a single number for a stack
 * whose height moves: it is only right for /guitar at a width where the
 * settings row fits on one line, and a narrower window wraps that row and adds
 * ~40px the constant cannot know about — which is what used to hang the last
 * fret off the bottom of the page. /guitar-test is further out still, stacking
 * a simulated-singer panel above the board.
 *
 * GuitarDisplay measures the board's real top offset and sizes from that; this
 * value only covers the frame before there is anything to measure.
 *
 * The headstock counts as chrome rather than as board even though it scrolls
 * with the neck: it sits above fret 0 inside the box and pushes the frets down
 * exactly as the control rows do, so leaving it out would size the rows for
 * space the neck does not have at rest.
 */
export const BOARD_VERTICAL_CHROME = 241 + HEADSTOCK_HEIGHT

/*
 * px — the one piece of chrome that sits BELOW the board: the page's own bottom
 * padding. The board is the last thing on the page, so nothing else does.
 *
 * Still a constant while the chrome above the board is measured, because it is
 * the one number a measurement cannot reach: a bottom padding leaves no element
 * to observe, and the slack under a board shorter than its box is not chrome.
 * Keep in step with the `pb-4` on GuitarPage's root.
 */
export const BOARD_BOTTOM_CHROME = 16

/*
 * px — the floor on the board's own scroll box, below which shrinking it stops
 * helping. Eight rows at the base height: enough neck to still read as one and
 * to play a position out of, and the point past which taking more from the
 * board would be worse than letting the page scroll the last of the chrome away.
 *
 * Reached only on a very short window — a phone in landscape, or a desktop
 * window dragged down to a strip — where guitarBoardAvailableHeight would
 * otherwise return a height near zero or below it.
 */
export const MIN_BOARD_VIEWPORT_HEIGHT = 8 * FRET_ROW_HEIGHT

/*
 * px — the hover/focus ring is painted as a box-shadow spread, which renders
 * OUTSIDE the element's box: its visible edge sits this far beyond fretRingSize
 * on every side. Leaving it out of the clearance below is what used to land the
 * ring on top of the fret wire. Keep in step with the spread in GuitarDisplay's
 * scoped CSS.
 */
export const FRET_RING_SHADOW_WIDTH = 2

/* px — a fret wire is drawn along the top edge of every fretted cell, so the
 * ring has to start below it rather than under it.
 *
 * 2 rather than 1: fretwire is a rounded crown of nickel, and a 1px hairline
 * has no room to shade across its height — it reads as a table rule, which is
 * what made the board look like a spreadsheet. At 2px the highlight and the
 * shadow each get a pixel and the wire reads as metal. */
export const FRET_WIRE_HEIGHT = 2

/*
 * px — the nut is thicker than a fret wire, as on a real neck, and it lands on
 * the top edge of row 1. That makes it the worst case the ring has to clear:
 * the ring is centred in its cell, so every row is sized for the thickest thing
 * any row has above it, not the hairline most of them get.
 *
 * 4, not 5: NUT_OVERHANG is ceil(half), so 4 buys a visibly chunkier bone nut
 * while landing on the same overhang 3 did — the ring clearance, and every size
 * derived from it, is unchanged.
 */
export const NUT_HEIGHT = 4

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
 * The share of the window the board's own scroll box takes on touch.
 *
 * Touch only. On a pointer the box is bounded by the page fit alone: there is
 * nothing below the fold to reach for there, so holding back 30% of the window
 * would shrink the neck to protect space nothing uses.
 *
 * Read off window.innerHeight rather than svh, which CSS alone knows: innerHeight
 * follows the LARGE viewport once the address bar collapses, so 0.7 × it can
 * overshoot the box the board actually sits in. Sizing off the smaller of this
 * and the page-chrome fit is what keeps that overshoot from mattering.
 */
const BOARD_TOUCH_VIEWPORT_RATIO = 0.7

/**
 * The height the board has to draw itself in, before it is divided into rows.
 *
 * Exported because it is the bound everything else is judged against: the row
 * solver divides by it, and the tests assert the board fits it rather than
 * restating the arithmetic and drifting from it. That drift is not
 * hypothetical — the touch ratio used to exist as three separate copies.
 */
export function guitarBoardAvailableHeight(
  viewportHeight: number,
  isCoarsePointer: boolean,
  chromeHeight: number = BOARD_VERTICAL_CHROME,
): number {
  const pageFit = viewportHeight - chromeHeight

  if (!isCoarsePointer) return pageFit

  return Math.min(pageFit, viewportHeight * BOARD_TOUCH_VIEWPORT_RATIO)
}

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
 * show the whole neck at once.
 *
 * At 23 rows neither branch reaches the ceiling on an ordinary screen — a tablet
 * lands on rows that fill its box rather than on MAX_FRET_ROW_HEIGHT, and a
 * laptop under ~957px cannot fit the board even at the base row. That last case
 * is not a failure: the rows stop at their floor and the board scrolls inside
 * its own box.
 *
 * That ~957px threshold is where the 22nd fret cost the most: at 20 rows it was
 * ~867px, so laptops between the two now scroll a neck they used to see whole.
 */
export function buildGuitarBoardScale(
  viewportHeight: number,
  isCoarsePointer: boolean,
  chromeHeight: number = BOARD_VERTICAL_CHROME,
): GuitarBoardScale {
  const available = guitarBoardAvailableHeight(
    viewportHeight,
    isCoarsePointer,
    chromeHeight,
  )
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
 * live-pitch preview uses cannot fall out of step with the board — including when
 * the tuning changes under it.
 */
export function guitarMidiMin(tuning: readonly number[]): number {
  return Math.min(...tuning)
}

export function guitarMidiMax(tuning: readonly number[]): number {
  return Math.max(...tuning) + GUITAR_MAX_FRET
}

/*
 * The board's ceiling as the duet split sees it — deliberately NOT
 * GUITAR_MAX_FRET.
 *
 * The crossover between the two singers' lanes is the midpoint of the range it
 * is handed (see crossoverFrequency in @/utils/duetBandSplit), so frets drawn
 * above this one would walk that boundary up with them. The split separates two
 * voices, not two halves of however much neck is on screen: at 15 the crossover
 * sits between B3 and C4, and lengthening the fingerboard must not push an alto
 * into the low band. The tuning still moves it, which is the point — retuning
 * changes what the low voice can actually reach.
 */
export const GUITAR_DUET_SPLIT_MAX_FRET = 15

export function guitarDuetMidiMax(tuning: readonly number[]): number {
  return Math.max(...tuning) + GUITAR_DUET_SPLIT_MAX_FRET
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
 * render — 6 strings × 23 rows is 138 of them.
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

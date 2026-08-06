/*
 * Everything painted on the board that is not a fret cell: inlay dots, string
 * lines, fret wires, and the classes a scale highlight tints a cell with.
 *
 * Split out of GuitarDisplay.vue because all of it is a pure function of
 * (stringWidth, boardHeight, scaleRole) — no props, no refs, no DOM — which is
 * the same split guitarLayout/guitarPreview/guitarLabels already follow.
 */

import type { ScaleRole } from '@/utils/scaleHighlight'
import {
  DOUBLE_INLAY_FRET,
  FRET_ROW_HEIGHT,
  GUITAR_STRING_COUNT,
  SINGLE_INLAY_FRETS,
} from './guitarLayout'

export type GuitarInlayDot = {
  key: string
  left: number
  top: number
}

export type GuitarStringLine = {
  key: string
  left: number
  width: number
}

/*
 * Inlay dots, all centred on the board's middle line — the boundary between
 * strings 4 and 3 — so they never sit under a note name.
 *
 * A real neck spreads the 12th fret's pair out to the string-5/4 and 3/2
 * boundaries, but that does not survive the translation to a diagram: with
 * evenly spaced string lines, a dot beside a string reads as belonging to that
 * string rather than to the fret. Keeping the pair tight around the centre
 * reads as one marker.
 */
const INLAY_CENTER_STRING_OFFSET = GUITAR_STRING_COUNT / 2 // 3 — board centre
export const INLAY_DOT_SIZE = 8 // px
/* px — each of the 12th fret's pair sits this far to either side of centre,
 * leaving a gap of about half a dot between them. */
const DOUBLE_INLAY_SPREAD = 7

export function buildGuitarInlays(stringWidth: number): GuitarInlayDot[] {
  const centerLeft = INLAY_CENTER_STRING_OFFSET * stringWidth
  const top = (fret: number) =>
    fret * FRET_ROW_HEIGHT + FRET_ROW_HEIGHT / 2 - INLAY_DOT_SIZE / 2

  return [
    ...SINGLE_INLAY_FRETS.map((fret) => ({
      key: `inlay-${fret}`,
      left: centerLeft,
      top: top(fret),
    })),
    ...[-1, 1].map((side) => ({
      key: `inlay-${DOUBLE_INLAY_FRET}-${side}`,
      left: centerLeft + side * DOUBLE_INLAY_SPREAD,
      top: top(DOUBLE_INLAY_FRET),
    })),
  ]
}

/* px — the low E is a wound string roughly twice the gauge of the high E, and
 * tapering the drawn width the same way makes the board readable at a glance. */
const MIN_STRING_LINE_WIDTH = 1
const MAX_STRING_LINE_WIDTH = 2.5

export function buildGuitarStringLines(
  stringWidth: number,
): GuitarStringLine[] {
  return Array.from({ length: GUITAR_STRING_COUNT }, (_, stringIndex) => ({
    key: `string-${stringIndex}`,
    /* Centre of the column, which is also where the note names sit. */
    left: (stringIndex + 0.5) * stringWidth,
    width:
      MAX_STRING_LINE_WIDTH -
      (stringIndex / (GUITAR_STRING_COUNT - 1)) *
        (MAX_STRING_LINE_WIDTH - MIN_STRING_LINE_WIDTH),
  }))
}

/* px — the hairline wire's own height, matching its h-px class. */
const FRET_WIRE_HEIGHT = 1

/*
 * A wire sits at the bottom of its fret's row. The last one would land at exactly
 * boardHeight and, being 1px tall, put the board's content 1px past its own box —
 * enough to give the scroller a permanent vertical scrollbar. Tuck that one
 * inside instead; at the board's bottom edge the difference is invisible.
 */
export function guitarFretWireTop(fret: number, boardHeight: number): number {
  return Math.min((fret + 1) * FRET_ROW_HEIGHT, boardHeight - FRET_WIRE_HEIGHT)
}

/* Scale highlight as a filled dot behind the note name — the chord-diagram
 * form, and unlike the piano's felt-strip pill it needs no reserved band inside
 * a 30px row. The root takes the deeper shade so the anchor reads at a glance;
 * both are legible on the board in either theme. */
const SCALE_DOT_CLASS: Record<'root' | 'scale', string> = {
  root: 'bg-(--p-blue-500)',
  scale: 'bg-(--p-blue-300)',
}

/* The name sits on top of the dot, so it needs a colour that survives the fill
 * rather than the muted grey it uses on the bare board. */
const SCALE_LABEL_CLASS: Record<'root' | 'scale', string> = {
  root: 'text-(--p-surface-0)',
  scale: 'text-(--p-surface-900)',
}

export function guitarScaleDotClass(role: ScaleRole): string | null {
  if (!role) return null

  return SCALE_DOT_CLASS[role]
}

export function guitarScaleLabelClass(role: ScaleRole): string | null {
  if (!role) return null

  return SCALE_LABEL_CLASS[role]
}

/* The strings are drawn down the middle of each column, straight through where
 * the names sit, so an unhighlighted name needs to mask the line behind it —
 * otherwise it reads as struck through. A scale dot already does that job, so
 * the backing only appears where there is no dot. */
export function guitarLabelBackingClass(role: ScaleRole): string | null {
  if (role) return null

  return 'rounded-full bg-(--p-surface-50) px-1 dark:bg-(--p-surface-800)'
}

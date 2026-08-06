/*
 * Everything painted on the board that is not a fret cell: inlay dots, string
 * lines, fret wires, and the classes a scale highlight tints a cell with.
 *
 * Split out of GuitarDisplay.vue because all of it is a pure function of
 * (stringWidth, boardHeight, scaleRole) — no props, no refs, no DOM — which is
 * the same split guitarLayout/guitarPreview/guitarLabels already follow.
 */

import type { ScaleEmphasis, ScaleRole } from '@/utils/scaleHighlight'
import {
  DOUBLE_INLAY_FRET,
  FRET_ROW_HEIGHT,
  FRET_WIRE_HEIGHT,
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

export function buildGuitarInlays(
  stringWidth: number,
  rowHeight: number = FRET_ROW_HEIGHT,
): GuitarInlayDot[] {
  const centerLeft = INLAY_CENTER_STRING_OFFSET * stringWidth
  const top = (fret: number) =>
    fret * rowHeight + rowHeight / 2 - INLAY_DOT_SIZE / 2

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

/*
 * Warm nickel — a wound string's colour, and deliberately NOT a hue. The board is
 * the slate ramp, so a neutral from the warm `stone` ramp differs from it in both
 * value and temperature while staying desaturated.
 *
 * Desaturated is the requirement, not a compromise: an earlier bronze pass
 * (amber-600/400) collided with the low preview lane's orange-400, and a dashed
 * segment that reads as the same colour as the strings it crosses stops being a
 * preview. The strings are structure; the lane is information, and it has to win.
 *
 * These are 1–2.5px hairlines, which need more contrast against their background
 * than a filled shape of the same colour would — hence a mid shade in light theme
 * and a lighter one in dark, rather than the near-background slate-300/600 the
 * lines used to share with the inlays.
 */
export const GUITAR_STRING_LINE_CLASS =
  'bg-(--p-stone-500) dark:bg-(--p-stone-400)'

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

/*
 * A wire marks the boundary at the bottom of its fret's row, and is centred on
 * it rather than hanging below it — that is where a real fret sits, and it halves
 * how far the thick nut reaches into the row beneath (see NUT_HEIGHT, which the
 * hover ring has to clear). A 1px hairline is unaffected: half of it rounds to
 * nothing.
 *
 * The last wire would land at exactly boardHeight and put the board's content
 * past its own box — enough to give the scroller a permanent vertical scrollbar.
 * Tuck that one inside instead; at the board's bottom edge the difference is
 * invisible.
 */
export function guitarFretWireTop(
  fret: number,
  boardHeight: number,
  rowHeight: number = FRET_ROW_HEIGHT,
  wireHeight: number = FRET_WIRE_HEIGHT,
): number {
  return Math.min(
    (fret + 1) * rowHeight - Math.floor(wireHeight / 2),
    boardHeight - wireHeight,
  )
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

/*
 * An unhighlighted name used to carry a pill in the board's own colour, to mask
 * the string line running down the middle of its column. Removed: the pill is
 * invisible against the board it matches, so its only other effect was to punch
 * a pale disc through the green press glow, which a highlighted name (with a
 * scale dot instead) never showed.
 *
 * The masking job itself came back when the strings gained contrast (see
 * GUITAR_STRING_LINE_CLASS above). A hairline in the board's own grey did vanish
 * behind a semibold name; a nickel one shows through the gaps around the strokes,
 * and the eye joins those segments into a strike through the letter. It is done in
 * GuitarDisplay's scoped CSS now, as a stroked halo on the name itself
 * (.guitar-fret-label) — that clears only the couple of px hugging each stroke, so
 * it keeps what the pill was for without drawing anything the glow can show a hole
 * in.
 */

/* The emphasized style is the fret button's own, so only the stepped-back state
 * needs an override — the muted grey these names carried before note names were
 * promoted above the string and fret numbers. */
export function guitarLabelEmphasisClass(
  emphasis: ScaleEmphasis,
): string | null {
  if (emphasis === 'emphasized') return null

  return 'font-normal text-(--p-text-muted-color)'
}

/*
 * Everything painted on the board that is not a fret cell: inlay dots, string
 * lines, fret wires, and the classes a scale highlight tints a cell with.
 *
 * Split out of GuitarDisplay.vue because all of it is a pure function of
 * (stringWidth, boardHeight, scaleRole) — no props, no refs, no DOM — which is
 * the same split guitarLayout/guitarPreview/guitarLabels already follow.
 */

import {
  pitchClassOf,
  type ScaleEmphasis,
  type ScaleRole,
} from '@/utils/scaleHighlight'
import {
  DOUBLE_INLAY_FRET,
  FRET_ROW_HEIGHT,
  FRET_WIRE_HEIGHT,
  GUITAR_STRING_COUNT,
  SINGLE_INLAY_FRETS,
} from './guitarLayout'

/*
 * The five pitch classes that take a sharp or a flat — the piano's black keys.
 * Read off the pitch class rather than the drawn label, which changes with the
 * accidental style (C♯ vs D♭) and is null altogether in 'off' mode.
 */
const ACCIDENTAL_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

export function isGuitarAccidentalMidi(midi: number): boolean {
  return ACCIDENTAL_PITCH_CLASSES.has(pitchClassOf(midi))
}

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
 * The 12th fret's pair spreads out to the string-5/4 and 3/2 boundaries, as on
 * a real neck. Those boundaries survive the translation to a diagram because
 * they are equidistant from the two string lines either side of them, so
 * neither string claims the dot; they also fall in the gap between two fret
 * cells, clear of every note name.
 */
const INLAY_CENTER_STRING_OFFSET = GUITAR_STRING_COUNT / 2 // 3 — board centre
export const INLAY_DOT_SIZE = 10 // px

/*
 * How far each of the 12th fret's pair sits either side of centre, in string
 * widths: exactly one column, which lands them on the A/D and G/B boundaries.
 *
 * A multiple of the column rather than a px constant — stringWidth flexes from
 * 36 to 72px, and a fixed spread would draw a pair twice as tight, relative to
 * its own board, on a wide desktop as on a phone.
 */
const DOUBLE_INLAY_SPREAD_STRINGS = 1

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
      left: centerLeft + side * DOUBLE_INLAY_SPREAD_STRINGS * stringWidth,
      top: top(DOUBLE_INLAY_FRET),
    })),
  ]
}

/* px — the low E is a wound string roughly twice the gauge of the high E, and
 * tapering the drawn width the same way makes the board readable at a glance. */
const MIN_STRING_LINE_WIDTH = 1
const MAX_STRING_LINE_WIDTH = 2.5

/*
 * Strings and inlays are drawn as gradients now — a cylinder's specular highlight
 * and a pearl's sheen are both a ramp across the shape, which no single-colour
 * utility can express — so these name a class that GuitarDisplay's scoped CSS
 * paints, rather than carrying the colour themselves.
 *
 * Every colour they resolve to lives in the --guitar-* block at the top of that
 * stylesheet, one definition per theme. That block is also where the string
 * palette's hard constraint is recorded: strings stay DESATURATED. An earlier
 * bronze pass (amber-600/400) collided with the low preview lane's orange-400,
 * and a dashed segment that reads as the same colour as the strings it crosses
 * stops being a preview. The board's warmth belongs to the wood, which is a
 * large field the lane sits on top of; the strings are hairlines the lane has to
 * cross, and it has to win.
 */
export const GUITAR_STRING_LINE_CLASS = 'guitar-string'

/*
 * The inlays are their own material — mother-of-pearl, not the strings' nickel —
 * so unlike before they no longer alias the string class. Both are still
 * hardware on wood, but a pearl dot that took the strings' flat grey disappeared
 * into pale maple, where a rimmed pearl reads at any board colour.
 */
export const GUITAR_INLAY_DOT_CLASS = 'guitar-inlay'

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

/*
 * How prominently a note name is drawn.
 *
 * 'emphasized' is the fret button's own style, so it needs no override; the
 * other two are the stepped-back readings.
 */
export type GuitarLabelTone = 'emphasized' | 'natural' | 'muted'

/**
 * Resolve a cell's label tone.
 *
 * With a scale selected, membership is the only thing worth reading and every
 * name outside it recedes equally — a board that also promoted the out-of-scale
 * naturals would be arguing with the highlight the singer just asked for.
 *
 * With no scale selected there is nothing competing, and a board of 120 names in
 * one grey is the flat, undifferentiated wall this split exists to break up.
 * Naturals carry the note names a beginner already knows, so they take the
 * foreground and the accidentals between them stay back. That is the same figure
 * the piano draws with white and black keys, and it costs no hue — so it cannot
 * collide with the scale dots or the preview lane.
 */
export function guitarLabelTone(
  emphasis: ScaleEmphasis,
  isScaleActive: boolean,
  isAccidental: boolean,
): GuitarLabelTone {
  if (emphasis === 'emphasized') return 'emphasized'
  if (isScaleActive) return 'muted'

  return isAccidental ? 'muted' : 'natural'
}

export function guitarLabelToneClass(tone: GuitarLabelTone): string | null {
  if (tone === 'emphasized') return null

  /* Both step back from the fret button's weight; they differ in how far. The
   * colours are board-relative (see the --guitar-* block in GuitarDisplay) —
   * --p-text-* is tuned for a surface background, and on wood the muted end of
   * it drops under a readable contrast. */
  if (tone === 'natural') return 'font-normal text-(--guitar-board-text)'

  return 'font-normal text-(--guitar-board-text-muted)'
}

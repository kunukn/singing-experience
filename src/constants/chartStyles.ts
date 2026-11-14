/* Shared Tailwind class strings for the Y-axis note-label buttons used by
   PitchHistoryChart and SingToneChart. Centralised here so colour and layout
   changes only need a single edit. */

export const CHART_LABEL_BASE =
  'absolute start-0 origin-center -translate-y-1/2 cursor-pointer border-none bg-transparent px-0 font-mono text-base transition-all duration-150'

export const CHART_LABEL_ACTIVE =
  'scale-110 text-(--p-button-success-background)'

export const CHART_LABEL_INACTIVE =
  'text-(--p-surface-400) hover:text-(--p-text-color)'

/* px reserved at the chart's start edge for the note-label buttons, and the
 * width of a single label inside it. The gutter grows past this when a voice
 * type ribbon is shown; the labels themselves never move. */
export const CHART_LABEL_GUTTER_WIDTH = 40
export const CHART_LABEL_WIDTH = 36

/* Extra offset past the chart edge used to visually signal an
 * out-of-range singer pitch. Applied as a canvas clamp on the three
 * canvas charts, and as a CSS offset on the DoReMiScale overflow
 * indicator. */
export const OUT_OF_RANGE_OVERFLOW_PX = 6

/* The singer's own range, wherever it is drawn as a bar. Voice types are
 * fixed, so their bars are solid; a singer's range grows with practice, so
 * theirs is striped — "not final" — in the guide lines' grey. Stripes rather
 * than an outline: an empty middle made the bar look thinner than the 8px
 * voice bars beside it. The colour is mixed, not faded with opacity, so the
 * same value works in dark mode. */
export const MY_RANGE_STRIPES =
  'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--p-text-muted-color) 60%, transparent) 0 2px, transparent 2px 5px)'

/* px width of the My range bar beside a chart's note axis, and the gap
 * between it and the note labels. */
export const MY_RANGE_BAR_WIDTH = 4
export const MY_RANGE_BAR_GAP = 4

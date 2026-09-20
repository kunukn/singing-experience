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

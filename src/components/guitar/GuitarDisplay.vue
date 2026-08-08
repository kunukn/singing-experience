<script setup lang="ts">
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'
import {
  DEFAULT_SCALE_HIGHLIGHT_MODE,
  buildScalePitchClasses,
  scaleEmphasisFor,
  scaleRoleForMidi,
  type ScaleEmphasis,
  type ScaleHighlightMode,
  type ScaleRole,
} from '@/utils/scaleHighlight'
import { useMediaQuery, useResizeObserver, useWindowSize } from '@vueuse/core'
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import {
  GUITAR_INLAY_DOT_CLASS,
  GUITAR_STRING_LINE_CLASS,
  INLAY_DOT_SIZE,
  buildGuitarInlays,
  buildGuitarStringLines,
  guitarFretWireTop,
  guitarLabelEmphasisClass,
  guitarScaleDotClass,
  guitarScaleLabelClass,
} from './guitarBoardDecorations'
import { guitarFretLabel } from './guitarLabels'
import {
  FRET_NUMBER_GUTTER,
  FRET_NUMBER_GUTTER_TOUCH,
  FRET_WIRE_HEIGHT,
  GUITAR_FRET_ROW_COUNT,
  GUITAR_STRING_COUNT,
  MAX_STRING_WIDTH,
  MIN_STRING_WIDTH_POINTER,
  MIN_STRING_WIDTH_TOUCH,
  NUT_HEIGHT,
  buildGuitarBoardScale,
  buildGuitarLayout,
  type GuitarCell,
} from './guitarLayout'
import {
  buildGuitarPreviewLanes,
  type GuitarPreviewLaneId,
} from './guitarPreview'
import { useGuitarFretPlayback } from './useGuitarFretPlayback'

type Props = {
  midiMin: number
  midiMax: number
  /* Open strings as MIDI, string 6 first — every fret's pitch derives from this,
   * so switching tuning relabels and re-tunes the whole board. */
  tuningMidi: readonly number[]
  /* Live mic preview lanes (from GuitarPage). One entry in single-voice mode,
   * two in duet mode. A lane with a null previewMidi draws nothing, so the
   * array length is stable while a singer is silent. */
  previewLanes?: Array<DuetLane & { laneId: GuitarPreviewLaneId }>
  /* Reserved for the preview overlay; the board itself draws the same either
   * way, since the fret cells already mark every pitch position. */
  isPreviewEnabled?: boolean
  /* Note names in the cells: 'off' (open strings only), 'simple' (bare names,
   * e.g. C♯), or 'advanced' (names with octave, e.g. C♯3). */
  toneLabelMode?: ToneLabelMode
  /* Whether accidentals read as C♯ or D♭. One or the other, not both: the fret
   * row is too short to stack the pair the way a piano key can. */
  accidentalStyle?: AccidentalStyle
  /* Root pitch class (0–11) of the scale to tint, or null for no highlighting. */
  scaleRoot?: number | null
  scaleMode?: ScaleHighlightMode
}
const props = defineProps<Props>()

/* Emitted whenever a fret sounds, so the parent can arm the preview deaf period
 * (stops the guitar's own tone registering as sung pitch). */
const emit = defineEmits<{ tonePlayed: [] }>()

const { pressCountFor, playFret, handleKeyDown } = useGuitarFretPlayback({
  onTonePlayed: () => emit('tonePlayed'),
})

/* Fetch and decode the guitar samples up front so the first fret press sounds
 * immediately rather than waiting on the network. */
onMounted(() => {
  void prewarmGuitarFretboard()
})

const accidentalStyle = computed<AccidentalStyle>(
  () => props.accidentalStyle ?? 'sharp',
)

function cellLabel(cell: GuitarCell): string | null {
  return guitarFretLabel(
    cell.midi,
    cell.fret,
    props.toneLabelMode ?? 'off',
    accidentalStyle.value,
  )
}

/* The screen-reader name has to match the label drawn in the cell, or the two
 * disagree about what the note is called. */
function cellAriaLabel(cell: GuitarCell): string {
  return midiToNoteLabel(cell.midi, {
    showOctave: true,
    preferFlats: accidentalStyle.value === 'flat',
  }).label
}

/* Built once per scale change, not once per cell — the board has 96 of them. */
const scalePitchClasses = computed(() =>
  buildScalePitchClasses(
    props.scaleRoot ?? null,
    props.scaleMode ?? DEFAULT_SCALE_HIGHLIGHT_MODE,
  ),
)

function scaleRole(cell: GuitarCell): ScaleRole {
  return scaleRoleForMidi(
    cell.midi,
    props.scaleRoot ?? null,
    scalePitchClasses.value,
  )
}

function scaleDotClass(cell: GuitarCell): string | null {
  return guitarScaleDotClass(scaleRole(cell))
}

function scaleLabelClass(cell: GuitarCell): string | null {
  return guitarScaleLabelClass(scaleRole(cell))
}

function labelEmphasis(cell: GuitarCell): ScaleEmphasis {
  return scaleEmphasisFor(scaleRole(cell))
}

function labelEmphasisClass(cell: GuitarCell): string | null {
  return guitarLabelEmphasisClass(labelEmphasis(cell))
}

/* A pressed fret washes green, then fades back out. Same timing as the piano so
 * the two instruments feel alike. */
const FRET_GLOW_DURATION_MS = 1200
const fretGlowDuration = `${FRET_GLOW_DURATION_MS}ms`

/* Fade curve, written out rather than as `ease-in` so it can be tweaked by
 * number: x1 is how long the green holds before opacity starts moving, and the
 * end pair stays (1, 1) so the drop runs out at full speed. */
const fretGlowEasing = 'cubic-bezier(0.42, 0, 1, 1)'

/*
 * Fit-to-container string sizing. The scroll box is w-full, so its width comes
 * from the parent and can't feed back from its own content — safe to observe
 * directly (unlike the w-fit abcjs sheets, which observe their parent).
 */
const scrollBox = useTemplateRef<HTMLElement>('scrollBox')
const containerWidth = ref(0)
useResizeObserver(scrollBox, ([entry]) => {
  containerWidth.value = entry.contentRect.width
})

const isCoarsePointer = useMediaQuery('(pointer: coarse)')

/* Wide enough to grab on touch, where this column is what you pan the board by. */
const fretNumberGutter = computed(() =>
  isCoarsePointer.value ? FRET_NUMBER_GUTTER_TOUCH : FRET_NUMBER_GUTTER,
)

/* Grow the strings to fill the container, bounded by a tap-target floor (larger
 * on touch) and a readable ceiling. Only the horizontal axis flexes: row height
 * is the pitch axis and must stay one fixed semitone unit. */
const stringWidth = computed(() => {
  const minWidth = isCoarsePointer.value
    ? MIN_STRING_WIDTH_TOUCH
    : MIN_STRING_WIDTH_POINTER
  /* Before the first ResizeObserver callback there is nothing to fit to. */
  if (!containerWidth.value) return minWidth

  const fitted =
    (containerWidth.value - fretNumberGutter.value) / GUITAR_STRING_COUNT

  /* Floor to whole px so a fractional remainder can't overflow by a hair and
   * trigger a scrollbar on a board that was meant to fit. */
  return Math.floor(Math.min(Math.max(fitted, minWidth), MAX_STRING_WIDTH))
})

/*
 * The board is ~500px tall, so on a phone it would push the controls off screen
 * and force the whole document to scroll to reach the low frets. Bounding it to
 * a slice of the viewport keeps the board self-contained instead.
 *
 * svh, not dvh: dvh grows and shrinks as the address bar collapses, which would
 * resize the board mid-scroll. 70% leaves room for the two control rows above,
 * and being proportional it degrades sensibly — a tall phone shows the whole
 * board, a short one scrolls a few rows.
 *
 * Touch only. On a mouse the board would capture the wheel whenever the cursor
 * crossed it on a short window, and there is no drag gesture to protect anyway.
 */
const BOARD_MAX_VIEWPORT_HEIGHT = '70svh'

const boardViewport = useTemplateRef<HTMLElement>('boardViewport')
const boardViewportHeight = ref(0)
useResizeObserver(boardViewport, ([entry]) => {
  boardViewportHeight.value = entry.contentRect.height
})

/*
 * Row height and everything that scales with it. Driven by the window rather
 * than by a measured container: the board's own height is what we are solving
 * for, so observing it would feed back on itself. Window height is an outside
 * input and cannot.
 */
const { height: windowHeight } = useWindowSize()
const boardScale = computed(() =>
  buildGuitarBoardScale(windowHeight.value, isCoarsePointer.value),
)

/* The hover ring and press glow live in scoped CSS, which cannot read a ref —
 * same v-bind bridge the glow's timing already uses. */
const fretRingSize = computed(() => `${boardScale.value.fretRingSize}px`)

const layout = computed(() =>
  buildGuitarLayout(
    stringWidth.value,
    props.tuningMidi,
    boardScale.value.rowHeight,
  ),
)

/* Tint the fret-number column while it is acting as the strip you pan by. Same
 * shape as the piano's isDragGutterVisible: pointless without a touch gesture,
 * and pointless when the whole board already fits. */
const isDragGutterVisible = computed(
  () =>
    isCoarsePointer.value &&
    boardViewportHeight.value > 0 &&
    layout.value.boardHeight > boardViewportHeight.value,
)

const fretNumbers = Array.from(
  { length: GUITAR_FRET_ROW_COUNT },
  (_, fret) => fret,
)

/* Fret 0's wire is the nut, drawn thicker and darker as on a real neck. */
function wireHeight(fret: number): number {
  return fret === 0 ? NUT_HEIGHT : FRET_WIRE_HEIGHT
}

function fretWireTop(fret: number): number {
  return guitarFretWireTop(
    fret,
    layout.value.boardHeight,
    layout.value.rowHeight,
    wireHeight(fret),
  )
}

/* px — the string-number row above the board. */
const STRING_HEADER_HEIGHT = 16

/* Guitarists count from the thinnest string, so the leftmost column (the low E
 * this layout puts first) is string 6 and the rightmost is string 1. */
const stringNumbers = Array.from(
  { length: GUITAR_STRING_COUNT },
  (_, stringIndex) => GUITAR_STRING_COUNT - stringIndex,
)

const stringLines = computed(() =>
  buildGuitarStringLines(layout.value.stringWidth),
)

const inlays = computed(() =>
  buildGuitarInlays(layout.value.stringWidth, layout.value.rowHeight),
)

/* Horizontal segment per string that can reach the sung pitch, plus one chip
 * per voice. Empty while nobody is singing. */
const previewLanes = computed(() =>
  buildGuitarPreviewLanes(
    props.previewLanes ?? [],
    props.tuningMidi,
    accidentalStyle.value,
    layout.value.rowHeight,
  ),
)

/* Two lanes in the same colour are impossible to tell apart, so the high band
 * gets its own hue. Orange stays with the low/only lane, matching the piano and
 * the single-voice preview this grew out of. */
const LANE_COLOUR_CLASS: Record<
  GuitarPreviewLaneId,
  { line: string; chip: string }
> = {
  low: { line: 'border-(--p-orange-400)/50', chip: 'text-(--p-orange-400)' },
  high: { line: 'border-(--p-blue-400)/50', chip: 'text-(--p-blue-400)' },
}

/*
 * Tap versus scroll. The board is ~500px tall, so on a phone the page scrolls
 * vertically straight through it, and @pointerdown would sound a note on the
 * first touch of every scroll drag. `click` does not fire on a scroll gesture,
 * so touch plays on click; a mouse keeps pointerdown's instant response, where
 * the scrollbar makes drag-panning unnecessary anyway.
 */
function handlePointerDown(cell: GuitarCell) {
  if (isCoarsePointer.value) return

  void playFret(cell.stringIndex, cell.fret, cell.midi)
}

function handleClick(cell: GuitarCell) {
  if (!isCoarsePointer.value) return

  void playFret(cell.stringIndex, cell.fret, cell.midi)
}
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <!-- Live-pitch chips, in a fixed band rather than riding their segments: one
         pitch draws up to six segments, and a chip on each would swamp the
         board. A fixed slot also keeps naming the note when the singer moves
         past the board's range and no segment can be drawn at all. -->
    <div
      class="flex h-5 items-center justify-center gap-3 text-xs leading-none font-semibold tabular-nums"
      data-testid="guitar-preview-chips"
    >
      <span
        v-for="lane in previewLanes"
        :key="lane.laneId"
        :class="LANE_COLOUR_CLASS[lane.laneId].chip"
        data-testid="guitar-preview-label"
        :data-lane="lane.laneId"
      >
        {{ lane.text }}
      </span>
    </div>

    <!-- A guitar is a fixed physical instrument (string 6 always on the left),
         so force LTR even in RTL locales; inline-start then coincides with
         left. -->
    <!-- overflow-y-hidden is not redundant: CSS promotes a `visible` axis to
         `auto` when the other axis is not visible, so overflow-x-auto alone makes
         this a vertical scroller too — and then a single stray pixel of content
         (a fret wire, a preview line clipped at the last fret) is enough to park
         a scrollbar here permanently. Vertical panning on touch belongs to the
         board viewport below, never to this box. -->
    <div
      ref="scrollBox"
      class="w-full overflow-x-auto overflow-y-hidden"
      dir="ltr"
      data-testid="guitar-display"
    >
      <div
        class="mx-auto"
        :style="{ width: `${fretNumberGutter + layout.boardWidth}px` }"
      >
        <!-- String numbers, counted the way guitarists do: string 1 is the
             thinnest and highest, string 6 the thickest and lowest. Decoration
             for orientation — each cell's aria-label already names its note.
             Outside the scroller below, so the columns stay identified however
             far the board is panned. -->
        <div
          class="flex"
          :style="{ height: `${STRING_HEADER_HEIGHT}px` }"
          aria-hidden="true"
        >
          <div class="shrink-0" :style="{ width: `${fretNumberGutter}px` }" />
          <div
            v-for="stringNumber in stringNumbers"
            :key="`string-number-${stringNumber}`"
            class="flex shrink-0 items-center justify-center tracking-wider text-(--p-surface-400) tabular-nums dark:text-(--p-surface-500)"
            :style="{
              width: `${layout.stringWidth}px`,
              fontSize: `${boardScale.gutterFontSize}px`,
            }"
          >
            {{ stringNumber }}
          </div>
        </div>

        <!-- On touch the board scrolls inside this box rather than dragging the
             whole document along with it. On a mouse it stays unbounded, so the
             wheel is never captured when the cursor crosses the board. -->
        <div
          ref="boardViewport"
          :class="isCoarsePointer && 'overflow-y-auto'"
          :style="{
            maxHeight: isCoarsePointer ? BOARD_MAX_VIEWPORT_HEIGHT : undefined,
          }"
          data-testid="guitar-board-viewport"
        >
          <div
            class="relative flex"
            :style="{ height: `${layout.boardHeight}px` }"
          >
            <!-- Fret numbers. aria-hidden because each cell's own aria-label
                 already names its note; reading "3" before every note would be
                 noise. On touch this column is also the only full-height strip
                 with no fret cells in it, so it is what you grab to pan the
                 board — hence the tint once the board actually overflows. -->
            <div
              class="shrink-0"
              :class="
                isDragGutterVisible &&
                'bg-(--p-surface-100) dark:bg-(--p-surface-800)'
              "
              :style="{ width: `${fretNumberGutter}px` }"
              aria-hidden="true"
              data-testid="guitar-drag-gutter"
            >
              <div
                v-for="fret in fretNumbers"
                :key="`fret-number-${fret}`"
                class="flex items-center justify-center text-(--p-surface-400) tabular-nums dark:text-(--p-surface-500)"
                :style="{
                  height: `${layout.rowHeight}px`,
                  fontSize: `${boardScale.gutterFontSize}px`,
                }"
              >
                {{ fret }}
              </div>
            </div>

            <div
              class="relative shrink-0 bg-(--p-surface-50) dark:bg-(--p-surface-800)"
              :style="{
                width: `${layout.boardWidth}px`,
                height: `${layout.boardHeight}px`,
              }"
            >
              <!-- Inlays, painted under everything: decoration that orients the
                 eye, not information, so they stay out of the accessibility
                 tree. Drawn in the strings' nickel (see GUITAR_INLAY_DOT_CLASS)
                 so the board's hardware reads as one material. -->
              <span
                v-for="dot in inlays"
                :key="dot.key"
                class="pointer-events-none absolute rounded-full"
                :class="GUITAR_INLAY_DOT_CLASS"
                :style="{
                  insetInlineStart: `${dot.left}px`,
                  top: `${dot.top}px`,
                  width: `${INLAY_DOT_SIZE}px`,
                  height: `${INLAY_DOT_SIZE}px`,
                  transform: 'translateX(-50%)',
                }"
                aria-hidden="true"
              />

              <!-- The strings, thickest at string 6 as on a real instrument.
                 Painted before the fret buttons, so every note name draws over
                 them; the halo on .guitar-fret-label is what stops a string
                 showing through the gaps in a glyph and reading as a strike. -->
              <span
                v-for="line in stringLines"
                :key="line.key"
                class="pointer-events-none absolute inset-y-0"
                :class="GUITAR_STRING_LINE_CLASS"
                :style="{
                  insetInlineStart: `${line.left}px`,
                  width: `${line.width}px`,
                  transform: 'translateX(-50%)',
                }"
                aria-hidden="true"
              />

              <!-- The nut (below the open row) and the fret wires below rows 1–15.
                 The nut is thicker and darker, as on a real neck. -->
              <span
                v-for="fret in fretNumbers"
                :key="`wire-${fret}`"
                class="pointer-events-none absolute inset-x-0"
                :class="
                  fret === 0
                    ? 'bg-(--p-text-color)'
                    : 'bg-(--p-content-border-color)'
                "
                :style="{
                  top: `${fretWireTop(fret)}px`,
                  height: `${wireHeight(fret)}px`,
                }"
                aria-hidden="true"
              />

              <button
                v-for="cell in layout.cells"
                :key="`${cell.stringIndex}-${cell.fret}`"
                type="button"
                class="guitar-fret absolute flex touch-manipulation items-center justify-center font-semibold text-(--p-text-color) select-none"
                :style="{
                  insetInlineStart: `${cell.leftPx}px`,
                  top: `${cell.topPx}px`,
                  width: `${layout.stringWidth}px`,
                  height: `${layout.rowHeight}px`,
                  fontSize: `${boardScale.labelFontSize}px`,
                }"
                :data-testid="`guitar-fret-${cell.stringIndex}-${cell.fret}`"
                :data-scale-role="scaleRole(cell) ?? undefined"
                :data-scale-emphasis="labelEmphasis(cell)"
                :aria-label="cellAriaLabel(cell)"
                @pointerdown="handlePointerDown(cell)"
                @click="handleClick(cell)"
                @keydown="
                  handleKeyDown($event, cell.stringIndex, cell.fret, cell.midi)
                "
              >
                <!-- Scale highlight. Decorative reinforcement of a filter the user
                 set themselves, so it stays out of the cell's aria-label —
                 narrating it on 96 cells would drown out the note names. The
                 dot doubles as the label's backing, so an unlabelled cell still
                 shows its scale membership. -->
                <span
                  v-if="scaleDotClass(cell)"
                  class="pointer-events-none absolute inset-0 m-auto rounded-full"
                  :class="scaleDotClass(cell)"
                  :style="{
                    width: `${boardScale.scaleDotSize}px`,
                    height: `${boardScale.scaleDotSize}px`,
                  }"
                  aria-hidden="true"
                />

                <!-- Press highlight, the filled counterpart of the hover ring, so
                 hovering previews the shape a press lights up. Painted over the
                 scale dot rather than under it: a green ring peeking out around a
                 blue dot would be too faint to register as a hit.

                 Keyed on the press count so a fresh press remounts the element
                 and replays the fade from full colour; an opacity transition
                 would instead be a no-op while already lit. -->
                <span
                  v-if="pressCountFor(cell.stringIndex, cell.fret)"
                  :key="`glow-${pressCountFor(cell.stringIndex, cell.fret)}`"
                  class="guitar-fret-glow pointer-events-none absolute inset-0 m-auto rounded-full bg-(--p-primary-color)"
                  aria-hidden="true"
                />

                <span
                  v-if="cellLabel(cell)"
                  class="guitar-fret-label relative leading-none"
                  :class="[scaleLabelClass(cell), labelEmphasisClass(cell)]"
                >
                  {{ cellLabel(cell) }}
                </span>
              </button>

              <!-- Live-pitch overlay: one dashed segment per string that can reach
               the sung pitch, each confined to its own string's column — a line
               spanning the board would mean the same fret on every string,
               which is six different pitches. Orange is the low/only voice,
               blue the high one in duet mode. pointer-events-none keeps the
               cells underneath tappable. -->
              <template v-for="lane in previewLanes" :key="lane.laneId">
                <div
                  v-for="segment in lane.segments"
                  :key="`${lane.laneId}-${segment.stringIndex}`"
                  class="pointer-events-none absolute z-20 h-0 -translate-y-[1.5px] border-t-3 border-dashed"
                  :class="LANE_COLOUR_CLASS[lane.laneId].line"
                  :style="{
                    insetInlineStart: `${segment.stringIndex * layout.stringWidth}px`,
                    top: `${segment.y}px`,
                    width: `${layout.stringWidth}px`,
                  }"
                  data-testid="guitar-preview-line"
                  :data-lane="lane.laneId"
                  :data-string="segment.stringIndex"
                />
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * Hover affordance: a ring on the fret position, not a wash across the cell. The
 * board is drawn in circles — note badges, scale dots, inlays — so a 60×30 filled
 * rectangle reads as a spreadsheet cell, and being full-bleed it also paints over
 * the string line running through the middle.
 *
 * A pseudo-element rather than a span: there are 96 cells, and none of them need
 * another node just to hold a hover state.
 */
.guitar-fret::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  /* 4px wider than the scale dot, so the ring still shows on a tinted cell
   * instead of hiding underneath it, and 6px short of the row so it clears the
   * fret wires. Both offsets come from buildGuitarBoardScale, which sizes the
   * pair together as the rows grow. */
  width: v-bind(fretRingSize);
  height: v-bind(fretRingSize);
  border-radius: 9999px;
  box-shadow: 0 0 0 2px var(--guitar-fret-ring-color);
  opacity: 0;
  transition: opacity 0.12s ease;
  pointer-events: none;
}

.guitar-fret {
  --guitar-fret-ring-color: var(--p-surface-400);
}

/* .p-dark sits on <html> (see useDarkMode), so this is an ancestor selector and
 * needs no :global wrapper. */
.p-dark .guitar-fret {
  --guitar-fret-ring-color: var(--p-surface-500);
}

/* Guarded, or a tap on a touch screen leaves the ring stuck on the last cell
 * pressed. Keyboard focus gets the same ring, so tabbing the board is legible. */
@media (hover: hover) {
  .guitar-fret:hover::after {
    opacity: 1;
  }
}

.guitar-fret:focus-visible::after {
  opacity: 1;
}

/*
 * A string line runs down the centre of every column, which is also where the note
 * name sits — so without a mask the string shows through the gaps in and around a
 * glyph, and the eye joins those segments into a strike through the letter. The
 * name is already painted over the string (the fret buttons come after the string
 * spans in the template, and both are z-index:auto in the board's one stacking
 * context); what is missing is clearance around the strokes.
 *
 * A halo around the glyph rather than the pill this replaces: it clears only the
 * couple of px hugging each stroke, so nothing is drawn across the rest of the cell
 * and the green press glow underneath stays whole. The pill was a solid disc in the
 * board's own colour — invisible on the bare board, but a pale hole punched through
 * the glow.
 *
 * A stroke, NOT a text-shadow. A blurred shadow is semi-transparent by construction:
 * spread over a 3px radius it only tints the string it is meant to hide, which is
 * exactly what the first attempt here did. A stroke is opaque, so it actually cuts.
 * paint-order puts it under the fill, leaving the glyph itself its normal weight
 * instead of eating 1.5px into it from every side.
 */
.guitar-fret-label {
  -webkit-text-stroke: 3px var(--p-surface-50);
  paint-order: stroke fill;
}

/* .p-dark sits on <html> (see useDarkMode), so this is an ancestor selector. */
.p-dark .guitar-fret-label {
  -webkit-text-stroke-color: var(--p-surface-800);
}

/* A highlighted cell needs none of this: the scale dot behind the name already
 * hides the string, and a halo in the board's colour would ring the name with a
 * colour the dot is not. */
.guitar-fret[data-scale-role] .guitar-fret-label {
  -webkit-text-stroke-width: 0;
}

/* Solid for the first beat (so the press reads as a hit), then out. */
@keyframes guitar-fret-glow {
  0%,
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.guitar-fret-glow {
  /* The hover ring's footprint, filled rather than outlined. */
  width: v-bind(fretRingSize);
  height: v-bind(fretRingSize);
  /* The curve is ease-in shaped: opacity barely moves early on, so the green
   * holds, then drops away quickly. See fretGlowEasing for the control points. */
  animation: guitar-fret-glow v-bind(fretGlowDuration) v-bind(fretGlowEasing)
    forwards;
}
</style>

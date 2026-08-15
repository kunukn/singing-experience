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
  guitarLabelTone,
  guitarLabelToneClass,
  guitarScaleDotClass,
  guitarScaleLabelClass,
  isGuitarAccidentalMidi,
} from './guitarBoardDecorations'
import { guitarFretLabel } from './guitarLabels'
import {
  BOARD_VERTICAL_CHROME,
  FRET_NUMBER_GUTTER,
  FRET_NUMBER_GUTTER_TOUCH,
  FRET_WIRE_HEIGHT,
  GUITAR_FRET_ROW_COUNT,
  GUITAR_STRING_COUNT,
  HEADSTOCK_HEIGHT,
  HEADSTOCK_PEG_SIZE,
  MAX_STRING_WIDTH,
  MIN_STRING_WIDTH_POINTER,
  MIN_STRING_WIDTH_TOUCH,
  NUT_HEIGHT,
  buildGuitarBoardScale,
  buildGuitarLayout,
  isGuitarMarkerFret,
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
  /* px of extra chrome stacked above the board by the host page, beyond what
   * BOARD_VERTICAL_CHROME accounts for. Only /guitar-test needs it. */
  extraVerticalChrome?: number
}
const props = defineProps<Props>()

/* Emitted whenever a fret sounds, so the parent can arm the preview deaf period
 * (stops the guitar's own tone registering as sung pitch). */
const emit = defineEmits<{ tonePlayed: [] }>()

const { pressCountFor, stringPressCountFor, playFret, handleKeyDown } =
  useGuitarFretPlayback({
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

/* Built once per scale change, not once per cell — the board has 120 of them. */
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

const isScaleActive = computed(() => (props.scaleRoot ?? null) !== null)

function labelToneClass(cell: GuitarCell): string | null {
  return guitarLabelToneClass(
    guitarLabelTone(
      labelEmphasis(cell),
      isScaleActive.value,
      isGuitarAccidentalMidi(cell.midi),
    ),
  )
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
 * How long a plucked string shivers. Short on purpose: a real string's visible
 * blur is gone long before the note is, so matching the 1200ms glow would read
 * as a wobbling line rather than a pluck. It ends well inside the sample's ring,
 * which is what carries the note.
 */
const STRING_VIBRATION_DURATION_MS = 380
const stringVibrationDuration = `${STRING_VIBRATION_DURATION_MS}ms`

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
 * The board is 600px tall at the base row and taller wherever there is room, so
 * on a phone it would push the controls off screen and force the whole document
 * to scroll to reach the high frets. Bounding it to a slice of the viewport
 * keeps the board self-contained instead.
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
 * Chrome above the board that this component cannot see for itself.
 * BOARD_VERTICAL_CHROME is calibrated for /guitar; the /guitar-test harness
 * stacks a simulated-singer panel on top and needs ~130px more, or its last
 * frets hang off the bottom of the screen.
 *
 * A prop rather than a measurement taken here. Measuring the board's own offset
 * looks safe — the board is last in a top-down column, so its height cannot move
 * its own top — but it oscillates in practice: a taller board toggles the page
 * scrollbar, the scrollbar changes the viewport width, the width change fires
 * `resize`, and re-measuring changes the height again. Whoever owns the extra
 * chrome measures it instead, where nothing the board does can feed back.
 */
const verticalChrome = computed(
  () => BOARD_VERTICAL_CHROME + (props.extraVerticalChrome ?? 0),
)

/*
 * Row height and everything that scales with it. Driven by the window rather
 * than by a measured container: the board's own height is what we are solving
 * for, so observing it would feed back on itself. Window height is an outside
 * input and cannot.
 */
const { height: windowHeight } = useWindowSize()
const boardScale = computed(() =>
  buildGuitarBoardScale(
    windowHeight.value,
    isCoarsePointer.value,
    verticalChrome.value,
  ),
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

/*
 * Two lanes in the same colour are impossible to tell apart, so the high band
 * gets its own hue. Orange stays with the low/only lane, matching the piano and
 * the single-voice preview this grew out of.
 *
 * Drawn at FULL opacity, not the /50 these carried on the old grey board. The
 * lane is the one thing on the board that reports what the singer is doing right
 * now, and a half-transparent dash takes on the colour it sits over — on pale
 * maple the orange washed out to nearly nothing. The separation from the wood
 * comes from .guitar-preview-line's shadow instead, which works on either theme
 * without spending the lane's own contrast to get it.
 */
const LANE_COLOUR_CLASS: Record<
  GuitarPreviewLaneId,
  { line: string; chip: string }
> = {
  low: { line: 'border-(--p-orange-400)', chip: 'text-(--p-orange-400)' },
  high: { line: 'border-(--p-blue-400)', chip: 'text-(--p-blue-400)' },
}

/*
 * Tap versus scroll. The board is at least 600px tall, so on a phone the page scrolls
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
  <div class="guitar-board-root flex w-full flex-col gap-1">
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

        <!-- The headstock, above the nut and OUTSIDE the scroll box below: it
             marks which end of the neck is fret 0, which it can only do while
             it is on screen. One peg per string column — a real headstock
             staggers them three per side, but the pegs here are read as "this
             string ends at this peg", and that is the column. -->
        <div class="flex" aria-hidden="true">
          <div class="shrink-0" :style="{ width: `${fretNumberGutter}px` }" />
          <div
            class="guitar-headstock relative shrink-0"
            :style="{
              width: `${layout.boardWidth}px`,
              height: `${HEADSTOCK_HEIGHT}px`,
            }"
            data-testid="guitar-headstock"
          >
            <span
              v-for="line in stringLines"
              :key="`peg-${line.key}`"
              class="guitar-peg absolute"
              :style="{
                insetInlineStart: `${line.left}px`,
                width: `${HEADSTOCK_PEG_SIZE}px`,
                height: `${HEADSTOCK_PEG_SIZE}px`,
              }"
            />
            <!-- The run of string from each peg down to the nut, so the six
                 lines below read as continuing rather than starting at fret 0. -->
            <span
              v-for="line in stringLines"
              :key="`peg-run-${line.key}`"
              class="guitar-peg-run absolute"
              :style="{
                insetInlineStart: `${line.left}px`,
                width: `${line.width}px`,
              }"
            />
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
              <!-- Marker frets read louder here for the same reason they carry
                   a face inlay: they are what a player counts positions by, and
                   a column of twenty numbers in one weight gives the eye nothing
                   to land on. The side dot beside them is the neck's edge
                   marker, which is the one a player actually looks at. -->
              <div
                v-for="fret in fretNumbers"
                :key="`fret-number-${fret}`"
                class="relative flex items-center justify-center tabular-nums"
                :class="
                  isGuitarMarkerFret(fret)
                    ? 'guitar-fret-number-marker font-semibold'
                    : 'text-(--p-surface-400) dark:text-(--p-surface-500)'
                "
                :style="{
                  height: `${layout.rowHeight}px`,
                  fontSize: `${boardScale.gutterFontSize}px`,
                }"
              >
                {{ fret }}
                <span v-if="isGuitarMarkerFret(fret)" class="guitar-side-dot" />
              </div>
            </div>

            <div
              class="guitar-board relative shrink-0"
              :style="{
                width: `${layout.boardWidth}px`,
                height: `${layout.boardHeight}px`,
              }"
              data-testid="guitar-board"
            >
              <!-- Inlays, painted under everything: decoration that orients the
                 eye, not information, so they stay out of the accessibility
                 tree. Mother-of-pearl (see GUITAR_INLAY_DOT_CLASS) — hardware
                 set into the wood, rather than a dot printed on top of it. -->
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
                }"
                aria-hidden="true"
              />

              <!-- The strings, thickest at string 6 as on a real instrument.
                 Painted before the fret buttons, so every note name draws over
                 them; the halo on .guitar-fret-label is what stops a string
                 showing through the gaps in a glyph and reading as a strike.

                 Keyed on the string's own press count so a pluck remounts the
                 element and replays the shiver, the same trick the fret glow
                 uses — a running animation cannot be restarted by re-applying
                 the class it is already wearing. -->
              <span
                v-for="(line, stringIndex) in stringLines"
                :key="`${line.key}-${stringPressCountFor(stringIndex)}`"
                class="pointer-events-none absolute inset-y-0"
                :class="[
                  GUITAR_STRING_LINE_CLASS,
                  stringPressCountFor(stringIndex) && 'guitar-string-vibrating',
                ]"
                :style="{
                  insetInlineStart: `${line.left}px`,
                  width: `${line.width}px`,
                }"
                aria-hidden="true"
              />

              <!-- The nut (below the open row) and the fret wires below rows 1–19.
                 The nut is bone, the wires nickel — two materials, as on a real
                 neck, rather than one hairline drawn twice at different weights. -->
              <span
                v-for="fret in fretNumbers"
                :key="`wire-${fret}`"
                class="pointer-events-none absolute inset-x-0"
                :class="fret === 0 ? 'guitar-nut' : 'guitar-fret-wire'"
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
                class="guitar-fret absolute flex touch-manipulation items-center justify-center font-semibold text-(--guitar-board-text) select-none"
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
                 narrating it on 120 cells would drown out the note names. The
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
                  :class="[scaleLabelClass(cell), labelToneClass(cell)]"
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
                  class="guitar-preview-line pointer-events-none absolute z-20 h-0 -translate-y-[1.5px] border-t-3 border-dashed"
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
 * THE BOARD PALETTE.
 *
 * Every colour the fretboard paints itself in, one definition per theme, so
 * retuning the instrument is an edit in one block rather than a hunt through the
 * template. Custom properties inherit, so defining them on the root wrapper
 * reaches the cells, the gutter and the headstock alike; .p-dark sits on <html>
 * (see useDarkMode), so the dark block is a plain ancestor selector.
 *
 * These are literal colours rather than --p-* tokens, which is the exception the
 * project's colour rule does not cover: Aura ships no wood, bone or pearl ramp,
 * and the nearest neighbours are wrong in the way that matters — amber-100 is a
 * yellow, stone-200 a grey, and a fingerboard is neither. Everything that CAN
 * come from a token still does (the scale dots, the preview lanes, the press
 * glow), so the parts that answer to the theme are unchanged.
 *
 * Light is maple, dark is rosewood — the two fingerboards the instrument
 * actually comes in, which is why the pair reads as one board under two lights
 * rather than as two different objects.
 */
.guitar-board-root {
  --guitar-board-surface: #e9dbc0;
  /* Depth at the edges, so the board reads as a radiused fingerboard rather
   * than a flat rectangle. Warm, not black: a grey shadow on wood looks like
   * dirt. */
  --guitar-board-vignette: rgb(120 85 45 / 0.2);
  --guitar-board-text: #3b2f24;
  --guitar-board-text-muted: #8a7863;

  /*
   * Fretwire, shaded across its 2px height: lit crown, body, shadowed root.
   *
   * The whole ramp sits DARKER than its dark-theme counterpart, which is the
   * rule every piece of hardware on this board follows: metal reads by
   * contrasting with the wood behind it, so on pale maple it has to go down
   * where on rosewood it goes up. Lifting these toward white — the obvious
   * first guess, since real fretwire is bright — is what made the first pass
   * disappear into the board.
   */
  --guitar-wire-high: #d5d9dd;
  --guitar-wire-body: #8d939a;
  --guitar-wire-low: #5c6369;

  /* Bone. Warmer and softer than the fretwire it sits in line with, which is
   * what separates the nut from just being a thicker fret. The low stop carries
   * the separation from the maple under it. */
  --guitar-nut-high: #fffdf5;
  --guitar-nut-body: #e4d8ba;
  --guitar-nut-low: #9c8f73;

  /* Nickel, DESATURATED — see the note on GUITAR_STRING_LINE_CLASS. The three
   * stops are one cylinder: shadowed edge, specular highlight, rounded body.
   * Same darker-on-maple rule as the fretwire above. */
  --guitar-string-shadow: #4a443d;
  --guitar-string-high: #d8d3cc;
  --guitar-string-body: #6f6862;

  /* Mother-of-pearl. The rim is what keeps it visible on pale maple, where the
   * pearl body and the board are within a few percent of each other. */
  --guitar-pearl-high: #ffffff;
  --guitar-pearl-body: #c3d0e0;
  --guitar-pearl-low: #7f92ad;
  --guitar-pearl-rim: rgb(85 65 40 / 0.55);

  /* Behind the pegs — the headstock is a separate piece of wood from the
   * fingerboard on most guitars, and a shade apart says so. */
  --guitar-headstock-surface: #d3bb94;
  --guitar-peg-high: #f4f6f8;
  --guitar-peg-low: #9aa1a8;

  /* What the preview lane is lifted off the wood with. Light board, light
   * halo. */
  --guitar-lane-shadow: rgb(255 255 255 / 0.7);
}

.p-dark .guitar-board-root {
  --guitar-board-surface: #3a2a1e;
  --guitar-board-vignette: rgb(0 0 0 / 0.3);
  --guitar-board-text: #f7ece0;
  --guitar-board-text-muted: #b09a83;

  --guitar-wire-high: #ffffff;
  --guitar-wire-body: #c9ced3;
  --guitar-wire-low: #8a9198;

  --guitar-nut-high: #fffdf5;
  --guitar-nut-body: #e6dcc4;
  --guitar-nut-low: #a89b80;

  --guitar-string-shadow: #6b645e;
  --guitar-string-high: #ffffff;
  --guitar-string-body: #b8b1aa;

  --guitar-pearl-high: #ffffff;
  --guitar-pearl-body: #dbe3ee;
  --guitar-pearl-low: #9aa8bd;
  --guitar-pearl-rim: rgb(0 0 0 / 0.45);

  --guitar-headstock-surface: #2c1f16;
  --guitar-peg-high: #e8ebee;
  --guitar-peg-low: #7d848b;

  --guitar-lane-shadow: rgb(0 0 0 / 0.6);
}

/*
 * The board itself: a wood colour, plus grain.
 *
 * The grain is an inline feTurbulence rather than an image file — it costs no
 * request and no bytes, and being procedural it tiles at any board size, which
 * matters because the board's width and height are both computed in px and
 * change with the viewport. A photograph would have to stretch (wrong) or tile
 * (seams), and could not follow the theme: it would bake one lighting direction
 * into a board that has to work on maple and rosewood both.
 *
 * baseFrequency is deliberately lopsided — high across the board, very low down
 * it — which stretches the noise into streaks running the length of the neck,
 * the direction real grain runs. soft-light lets the wood colour underneath set
 * the hue and the noise only vary its value, so one texture serves both themes.
 */
.guitar-board {
  background-color: var(--guitar-board-surface);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='640'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.5 0.005' numOctaves='4' seed='11'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='320' height='640' filter='url(%23g)' opacity='0.5'/%3E%3C/svg%3E");
  background-blend-mode: soft-light;
  border-radius: 7px;
  box-shadow: inset 0 0 18px 2px var(--guitar-board-vignette);
  /* The grain and the vignette both run to the rounded corners; without this
   * they square them off again. */
  overflow: hidden;
}

.guitar-fret-wire {
  background: linear-gradient(
    180deg,
    var(--guitar-wire-high),
    var(--guitar-wire-body) 50%,
    var(--guitar-wire-low)
  );
  box-shadow: 0 1px 1.5px rgb(0 0 0 / 0.35);
}

.guitar-nut {
  background: linear-gradient(
    180deg,
    var(--guitar-nut-high),
    var(--guitar-nut-body) 55%,
    var(--guitar-nut-low)
  );
  box-shadow: 0 2px 4px rgb(0 0 0 / 0.45);
  border-radius: 1px;
}

/*
 * A string is a cylinder, so the ramp runs ACROSS its width (90deg) rather than
 * down its length: shadowed edge, highlight where the light catches, body,
 * shadowed edge again. On the 1px treble strings only the highlight survives,
 * which is correct — a plain steel E really is just a bright line.
 *
 * translateX(-50%) is here rather than inline because the vibration keyframes
 * below also drive transform, and an inline transform in the style attribute
 * would be the thing they have to fight.
 */
.guitar-string {
  transform: translateX(-50%);
  background: linear-gradient(
    90deg,
    var(--guitar-string-shadow),
    var(--guitar-string-high) 40%,
    var(--guitar-string-body) 70%,
    var(--guitar-string-shadow)
  );
  box-shadow: 0 0 1.5px rgb(0 0 0 / 0.45);
}

/*
 * A plucked string shivers. Off-centre highlight, decaying swing, and a touch of
 * blur at the start where a real string is moving fastest — the blur is what
 * sells it, since a 1px line displaced by a pixel just looks misplaced.
 *
 * The offsets are tiny on purpose: the string runs down the middle of a column
 * of note names, and a wider swing reads as the layout breaking rather than as
 * the instrument sounding.
 */
@keyframes guitar-string-vibrate {
  0% {
    transform: translateX(-50%) translateX(0);
    filter: blur(0);
  }
  8% {
    transform: translateX(-50%) translateX(1.1px);
    filter: blur(0.7px);
  }
  22% {
    transform: translateX(-50%) translateX(-0.9px);
  }
  40% {
    transform: translateX(-50%) translateX(0.6px);
    filter: blur(0.35px);
  }
  60% {
    transform: translateX(-50%) translateX(-0.4px);
  }
  80% {
    transform: translateX(-50%) translateX(0.2px);
  }
  100% {
    transform: translateX(-50%) translateX(0);
    filter: blur(0);
  }
}

.guitar-string-vibrating {
  animation: guitar-string-vibrate v-bind(stringVibrationDuration) ease-out;
}

/* Motion for its own sake, and the note sounds either way — so drop it rather
 * than shrink it when the singer has asked for less. */
@media (prefers-reduced-motion: reduce) {
  .guitar-string-vibrating {
    animation: none;
  }
}

/*
 * Mother-of-pearl: a bright off-centre catch falling away to a cool shade, which
 * is the whole of what makes shell read as shell rather than as a white circle.
 * The inset shadow seats it IN the wood; the rim keeps its edge on pale maple,
 * where the pearl and the board are otherwise nearly the same value.
 */
.guitar-inlay {
  transform: translateX(-50%);
  background: radial-gradient(
    circle at 34% 26%,
    var(--guitar-pearl-high),
    var(--guitar-pearl-body) 52%,
    var(--guitar-pearl-low)
  );
  box-shadow:
    inset 0 -1px 2px rgb(60 70 90 / 0.45),
    0 0 0 1px var(--guitar-pearl-rim);
}

/* The headstock, and the tuning pegs on it. Rounded at the top only — the
 * bottom edge butts against the nut. */
.guitar-headstock {
  background-color: var(--guitar-headstock-surface);
  border-radius: 7px 7px 0 0;
  box-shadow: inset 0 0 12px 2px var(--guitar-board-vignette);
}

.guitar-peg {
  top: 4px;
  transform: translateX(-50%);
  border-radius: 9999px;
  background: linear-gradient(
    145deg,
    var(--guitar-peg-high),
    var(--guitar-peg-low)
  );
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.45);
}

/* From under the peg to the bottom of the band, where the board's own string
 * lines pick it up. */
.guitar-peg-run {
  top: 12px;
  bottom: 0;
  transform: translateX(-50%);
  background: linear-gradient(
    90deg,
    var(--guitar-string-shadow),
    var(--guitar-string-high) 40%,
    var(--guitar-string-body) 70%,
    var(--guitar-string-shadow)
  );
}

/* The neck-edge markers, in the fret-number gutter at the board side of it —
 * that gutter IS the edge of the neck as this board draws it. */
.guitar-side-dot {
  position: absolute;
  inset-inline-end: 3px;
  top: 50%;
  width: 4px;
  height: 4px;
  transform: translateY(-50%);
  border-radius: 9999px;
  background: var(--guitar-pearl-body);
  box-shadow: 0 0 0 0.5px var(--guitar-pearl-rim);
}

.guitar-fret-number-marker {
  color: var(--guitar-board-text-muted);
}

/*
 * The preview lane, lifted off the wood.
 *
 * drop-shadow, not box-shadow: the element is a 0-height box wearing a dashed
 * border, so a box-shadow would trace the box and not the dashes. drop-shadow
 * follows the painted alpha, so each dash gets its own edge — which is what
 * keeps the lane legible where it crosses a string or an inlay.
 */
.guitar-preview-line {
  filter: drop-shadow(0 1px 1px var(--guitar-lane-shadow));
}

/*
 * Hover affordance: a ring on the fret position, not a wash across the cell. The
 * board is drawn in circles — note badges, scale dots, inlays — so a 60×30 filled
 * rectangle reads as a spreadsheet cell, and being full-bleed it also paints over
 * the string line running through the middle.
 *
 * A pseudo-element rather than a span: there are 120 cells, and none of them need
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

/* Drawn in the board's own muted text rather than a surface grey: the ring sits
 * on wood, and a slate ring on rosewood reads as a stray artefact. */
.guitar-fret {
  --guitar-fret-ring-color: var(--guitar-board-text-muted);
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
/*
 * The halo has to BE the board's colour — it works by painting the board back
 * over the string behind the glyph. Taken from the same custom property the
 * board's own background reads, so retuning the wood cannot leave note names
 * ringed in the colour the board used to be. That coupling was previously two
 * hard-coded surface tokens, which is exactly the pair that would have been
 * missed here.
 */
.guitar-fret-label {
  -webkit-text-stroke: 3px var(--guitar-board-surface);
  paint-order: stroke fill;
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

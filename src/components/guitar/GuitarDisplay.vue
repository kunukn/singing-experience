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
  BOARD_BOTTOM_CHROME,
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
  MIN_BOARD_VIEWPORT_HEIGHT,
  MIN_STRING_WIDTH_TOUCH,
  NUT_HEIGHT,
  buildGuitarBoardScale,
  buildGuitarLayout,
  guitarBoardAvailableHeight,
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

/* Built once per scale change, not once per cell — the board has 138 of them. */
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

const boardViewport = useTemplateRef<HTMLElement>('boardViewport')
/*
 * px taken by the board's own vertical scrollbar, where the platform draws a
 * classic one rather than an overlay. The board inside is a fixed pixel width,
 * so a scrollbar that ate into the box would push it out the side and park a
 * horizontal scrollbar here too — see the width the wrapper below is given.
 */
const boardScrollbarWidth = ref(0)
useResizeObserver(boardViewport, ([entry]) => {
  const element = entry.target as HTMLElement
  boardScrollbarWidth.value = element.offsetWidth - element.clientWidth
})

/* Grow the strings to fill the container, bounded by a tap-target floor (larger
 * on touch) and a readable ceiling. Only the horizontal axis flexes: row height
 * is the pitch axis and must stay one fixed semitone unit. */
const stringWidth = computed(() => {
  const minWidth = isCoarsePointer.value
    ? MIN_STRING_WIDTH_TOUCH
    : MIN_STRING_WIDTH_POINTER
  /* Before the first ResizeObserver callback there is nothing to fit to. */
  if (!containerWidth.value) return minWidth

  /* The board's own scrollbar sits beside the neck inside this container, so
   * the strings have that much less to grow into. */
  const fitted =
    (containerWidth.value -
      fretNumberGutter.value -
      boardScrollbarWidth.value) /
    GUITAR_STRING_COUNT

  /* Floor to whole px so a fractional remainder can't overflow by a hair and
   * trigger a scrollbar on a board that was meant to fit. */
  return Math.floor(Math.min(Math.max(fitted, minWidth), MAX_STRING_WIDTH))
})

/*
 * The window is the outside input every vertical size here is solved against.
 * The board's own height is what is being solved for, so measuring that would
 * feed back on itself; the window cannot.
 */
const { height: windowHeight } = useWindowSize()

/*
 * Everything above the board, measured rather than assumed.
 *
 * The board is last in a top-down column, so its own height cannot move its own
 * top — but a single constant still cannot describe this stack, because the
 * settings row wraps to a second line on a narrower window and adds ~40px to it.
 * That is what used to size the rows for space the page did not have and hang
 * the last fret off the bottom.
 *
 * Measuring was avoided before because it oscillated: a taller board toggled the
 * page scrollbar, the scrollbar changed the viewport width, and the width change
 * re-measured to a different answer. Bounding the board to its own scroll box is
 * what closes that loop — the page no longer grows with the board, so nothing
 * the board does can come back around and move its top.
 */
const boardTopOffset = ref(0)

function measureBoardTopOffset() {
  const element = boardViewport.value
  if (!element) return

  boardTopOffset.value = element.getBoundingClientRect().top + window.scrollY
}

/*
 * Re-measure on anything that can re-flow the chrome, not just on resize: a
 * locale switch relayouts the settings row without the window moving at all.
 * Observing the body catches every one of them, and converges in a single pass
 * because the offset it reads does not depend on the height it produces.
 */
onMounted(() => {
  measureBoardTopOffset()
})
useResizeObserver(
  () => document.body,
  () => measureBoardTopOffset(),
)

/*
 * The headstock is measured as chrome even though it scrolls with the neck: it
 * sits above fret 0 inside the box, so it pushes the frets down exactly as the
 * control rows do and the rows must not be sized for the space it occupies.
 * boardMaxHeight adds it back to the box, which is what lets it scroll away and
 * hand its height to the frets once you are past it.
 *
 * BOARD_VERTICAL_CHROME (plus the harness prop, for /guitar-test) covers only
 * the first frame, before the board is in the document to be measured; it
 * already carries HEADSTOCK_HEIGHT for the same reason.
 */
const verticalChrome = computed(() =>
  boardTopOffset.value > 0
    ? boardTopOffset.value + HEADSTOCK_HEIGHT + BOARD_BOTTOM_CHROME
    : BOARD_VERTICAL_CHROME + (props.extraVerticalChrome ?? 0),
)

/*
 * The board scrolls inside its own box rather than taking the page with it.
 *
 * At the base row the board is 690px tall and taller wherever there is room, so
 * unbounded it pushes the controls off the top of a laptop window and the whole
 * document has to scroll to reach the high frets — the controls you reach for
 * mid-practice scroll away with it. Bounding it keeps the neck self-contained
 * and the controls where they were.
 *
 * The wheel is not captured in the way that kept this to touch before: once the
 * board is scrolled to the last fret the wheel chains out to the page as usual,
 * and on a window that fits the whole neck there is nothing for it to capture.
 */
const boardFretsHeight = computed(() =>
  Math.max(
    guitarBoardAvailableHeight(
      windowHeight.value,
      isCoarsePointer.value,
      verticalChrome.value,
    ),
    MIN_BOARD_VIEWPORT_HEIGHT,
  ),
)

/* The box holds the headstock as well as the frets, so it is that much taller
 * than the neck it is sized to show. */
const boardMaxHeight = computed(
  () => `${boardFretsHeight.value + HEADSTOCK_HEIGHT}px`,
)

/* Which edge of the board still has neck behind it — drives the fade that says
 * a row clipped at the boundary is not where the fingerboard ends. */
const { canScrollStart: canScrollUp, canScrollEnd: canScrollDown } =
  useScrollEdgeMask(boardViewport, 'block')

/* Row height and everything that scales with it. */
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
 * Tap versus scroll. The board is at least 690px tall and its box on a phone is
 * shorter than that, so a finger dragged across it pans the neck — and
 * @pointerdown would sound a note on the first touch of every such drag. `click` does not fire on a scroll gesture,
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
      <!-- Wide enough for the board plus whatever the board's own scrollbar
           takes, so a classic (non-overlay) scrollbar narrows the box without
           squeezing the fixed-width neck out the side of it. -->
      <div
        class="mx-auto"
        :style="{
          width: `${fretNumberGutter + layout.boardWidth + boardScrollbarWidth}px`,
        }"
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

        <!-- The board scrolls inside this box rather than dragging the whole
             document along with it, so the controls above it stay put however
             far down the neck you are. Bounded on every pointer type: see
             boardMaxHeight.

             The edge fade is the only thing that says a fretboard clipped
             mid-row has more neck below rather than simply ending there — the
             board's own rounded, filled bottom edge otherwise reads as
             finished. Same mask the settings rows use, on the block axis. -->
        <div
          ref="boardViewport"
          class="guitar-board-viewport overflow-y-auto"
          :class="{ 'mask-start': canScrollUp, 'mask-end': canScrollDown }"
          :style="{ maxHeight: boardMaxHeight }"
          data-testid="guitar-board-viewport"
        >
          <!-- The headstock, above the nut and INSIDE the scroll box: it is
               fastened to fret 0, so pinning it while the neck scrolled under
               it drew pegs joined to strings that started six frets down. What
               it was pinned for — which end of the neck you are looking at —
               the fret-number gutter answers at every scroll position anyway.

               One peg per string column: a real headstock staggers them three
               per side, but the pegs here are read as "this string ends at this
               peg", and that is the column. -->
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
          <div
            class="relative flex"
            :style="{ height: `${layout.boardHeight}px` }"
          >
            <!-- Fret numbers. aria-hidden because each cell's own aria-label
                 already names its note; reading "3" before every note would be
                 noise.

                 Deliberately untinted, unlike the piano's drag gutter. That
                 strip exists because a piano key sounds on @pointerdown, so a
                 pan has to start somewhere that is not a key; a fret sounds on
                 @click, which no scroll gesture fires, so the neck itself is
                 already somewhere you can start a pan. Advertising this column
                 as the handle would teach a gesture nobody needs — and the
                 board's edge fade already says there is more neck below. -->
            <div
              class="shrink-0"
              :style="{ width: `${fretNumberGutter}px` }"
              aria-hidden="true"
              data-testid="guitar-fret-numbers"
            >
              <!-- Marker frets read louder here for the same reason they carry
                   a face inlay: they are what a player counts positions by, and
                   a column of twenty-three numbers in one weight gives the eye
                   nothing to land on. The side dot beside them is the neck's edge
                   marker, which is the one a player actually looks at. -->
              <div
                v-for="fret in fretNumbers"
                :key="`fret-number-${fret}`"
                class="guitar-fret-number relative flex items-center justify-center tabular-nums"
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
                 tree. Flat dots (see GUITAR_INLAY_DOT_CLASS), in the same grey
                 as the side markers along the neck edge. -->
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

              <!-- The nut (below the open row) and the fret wires below rows 1–22.
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
 * THE BOARD PALETTE.
 *
 * Every colour the fretboard paints itself in, one definition per theme, so
 * retuning the instrument is an edit in one block rather than a hunt through the
 * template. Custom properties inherit, so defining them on the root wrapper
 * reaches the cells, the gutter and the headstock alike; .p-dark sits on <html>
 * (see useDarkMode), so the dark block is a plain ancestor selector.
 *
 * The board itself is a plain --p-surface-* field, so it follows the theme like
 * every other panel in the app. The HARDWARE is the exception the project's
 * colour rule does not cover, and the only thing here written as literal hex:
 * Aura ships no nickel or bone ramp, and each of these is a three-stop gradient
 * across a 1–4px shape — a shaded crown, a specular highlight — which no single
 * token can express. Everything else the board draws (scale dots, preview lanes,
 * press glow, note names) comes from tokens.
 */
.guitar-board-root {
  --guitar-board-surface: var(--p-surface-50);

  /* The face inlays and the neck-edge side dots — the same markers seen from
   * two angles, so they take one colour. Flat, deliberately: they orient the
   * eye and nothing more, and a shaded dot on a flat board reads as a bubble
   * sitting on top of it rather than as a marker set into it. */
  --guitar-inlay-color: var(--p-stone-500);

  /*
   * Fretwire, shaded across its 2px height: lit crown, body, shadowed root.
   *
   * The whole ramp sits DARKER than its dark-theme counterpart, which is the
   * rule every piece of hardware on this board follows: metal reads by
   * contrasting with the board behind it, so on a pale surface it has to go
   * down where on a dark one it goes up. Lifting these toward white — the
   * obvious first guess, since real fretwire is bright — is what made the first
   * pass disappear into the board.
   */
  --guitar-wire-high: #d5d9dd;
  --guitar-wire-body: #8d939a;
  --guitar-wire-low: #5c6369;

  /*
   * Bone. Warmer and softer than the fretwire it sits in line with, which is
   * what separates the nut from just being a thicker fret. The low stop carries
   * the separation from the pale board under it.
   *
   * Warm by hue only, not by saturation: the body stop is held near 12%, where
   * it reads as off-white bone. An earlier pass ran it at 34% and the nut came
   * out visibly tan — at 4px tall and spanning the whole board, this is the
   * largest single field of colour on the neck, so it takes far more saturation
   * than its area suggests.
   */
  --guitar-nut-high: #eae6df;
  --guitar-nut-body: #cbc5b9;
  --guitar-nut-low: #877f72;

  /* Nickel, DESATURATED — see the note on GUITAR_STRING_LINE_CLASS. The three
   * stops are one cylinder: shadowed edge, specular highlight, rounded body.
   * Same darker-on-a-pale-board rule as the fretwire above. */
  --guitar-string-shadow: #4a443d;
  --guitar-string-high: #d8d3cc;
  --guitar-string-body: #6f6862;

  /* Behind the pegs — the headstock is a separate piece from the fingerboard on
   * a real guitar, and a shade apart says so. */
  --guitar-headstock-surface: var(--p-surface-100);
  --guitar-peg-high: #f4f6f8;
  --guitar-peg-low: #9aa1a8;
}

.p-dark .guitar-board-root {
  --guitar-board-surface: var(--p-surface-800);

  --guitar-inlay-color: var(--p-stone-400);

  --guitar-wire-high: #ffffff;
  --guitar-wire-body: #c9ced3;
  --guitar-wire-low: #8a9198;

  --guitar-nut-high: #f7f5f0;
  --guitar-nut-body: #ddd8cd;
  --guitar-nut-low: #a09a8e;

  --guitar-string-shadow: #6b645e;
  --guitar-string-high: #ffffff;
  --guitar-string-body: #b8b1aa;

  --guitar-headstock-surface: var(--p-surface-700);
  --guitar-peg-high: #e8ebee;
  --guitar-peg-low: #7d848b;
}

/*
 * Edge fade on whichever end of the neck still has frets behind it. The board
 * is a filled, rounded panel, so a boundary that clips a row mid-height reads
 * as the fingerboard ending rather than continuing — this is what tells the two
 * apart. Same mask-start/mask-end contract as EdgeFadeScroller, on the block
 * axis, so both fades come and go with useScrollEdgeMask.
 *
 * 1.25rem rather than the 1.5rem the settings rows fade over: a fret row is
 * only 30px at its floor, and a wider fade would wash out the note names on the
 * last row instead of just softening the cut.
 */
.guitar-board-viewport.mask-start.mask-end {
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    black 1.25rem,
    black calc(100% - 1.25rem),
    transparent 100%
  );
}

.guitar-board-viewport.mask-start:not(.mask-end) {
  mask-image: linear-gradient(to bottom, transparent 0, black 1.25rem);
}

.guitar-board-viewport.mask-end:not(.mask-start) {
  mask-image: linear-gradient(
    to bottom,
    black calc(100% - 1.25rem),
    transparent 100%
  );
}

/* The board itself: one flat surface colour, so it sits in the theme like any
 * other panel and leaves the contrast to the hardware drawn on top of it. */
.guitar-board {
  background-color: var(--guitar-board-surface);
  border-radius: 7px;
  /* The fret wires and the strings run edge to edge; without this they square
   * the rounded corners off again. */
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

/* A flat marker dot. Scoped CSS rather than a background utility only because
 * of the centring transform: the dot is positioned by its column's centre line,
 * and half its own width has to come back off. */
.guitar-inlay {
  transform: translateX(-50%);
  background: var(--guitar-inlay-color);
}

/* The headstock, and the tuning pegs on it. Rounded at the top only — the
 * bottom edge butts against the nut. */
.guitar-headstock {
  background-color: var(--guitar-headstock-surface);
  border-radius: 7px 7px 0 0;
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

/*
 * The dot's lane, kept clear of the number.
 *
 * The number is centred and the dot is pinned to the end, so the number's end
 * edge walks outward with every digit while the dot stays put: frets 0–9 cleared
 * it by 3.4px, frets 12/15/19/21/22 overlapped it by 0.3. Reserving the lane as padding
 * takes the dot out of the centring altogether, so the clearance no longer
 * depends on how many digits the fret has.
 *
 * Padding rather than a narrower centring box: an absolutely positioned element
 * is offset from its container's PADDING box, so this re-centres the number
 * without moving the dot a pixel. Applied to every row, dot or not, so the column
 * of numbers stays on one axis.
 */
.guitar-fret-number {
  /* 4px dot + its 3px inset from the edge, + 2px so they read as separate. */
  padding-inline-end: 9px;
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
  /* The same colour as the face inlay it sits level with — one marker, seen
   * from the face and from the edge. */
  background: var(--guitar-inlay-color);
}

.guitar-fret-number-marker {
  color: var(--p-text-muted-color);
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

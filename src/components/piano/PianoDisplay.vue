<script setup lang="ts">
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { midiToNoteLabel } from '@/utils/noteUtils'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'
import PianoOctaveShift from './PianoOctaveShift.vue'
import { pianoKeyLabel } from './pianoLabels'
import {
  BLACK_KEY_HEIGHT_RATIO,
  MAX_SEMITONE_UNIT,
  MIN_SEMITONE_UNIT_POINTER,
  MIN_SEMITONE_UNIT_TOUCH,
  PIANO_DRAG_GUTTER_HEIGHT,
  PIANO_LABEL_BAND_HEIGHT,
  WHITE_KEY_HEIGHT,
  buildPianoLayout,
  pianoSpanUnits,
  type PianoKey,
} from './pianoLayout'
import { buildPianoPreviewLines, type PianoPreviewLaneId } from './pianoPreview'
import type { DuetLane } from './useDuetPitchDetection'
import { usePianoKeyPlayback } from './usePianoKeyPlayback'
import { usePianoKeyboardInput } from './usePianoKeyboardInput'

type Props = {
  midiMin: number
  midiMax: number
  /* Live mic preview lanes (from PianoPage). One entry in single-voice mode,
   * two in duet mode. A lane with a null previewMidi draws nothing, so the
   * array length is stable while a singer is silent. */
  previewLanes?: Array<DuetLane & { laneId: PianoPreviewLaneId }>
  /* When true, draws the grey dead-center hint line on every key. */
  isPreviewEnabled?: boolean
  /* Note-name labels on the key face: 'off' (C-key octave markers only), 'simple'
   * (bare names, e.g. C♯), or 'advanced' (names with octave, e.g. C♯2). */
  toneLabelMode?: ToneLabelMode
}
const props = defineProps<Props>()

function keyLabel(key: PianoKey): string | null {
  return pianoKeyLabel(key, props.toneLabelMode ?? 'off', {
    midiMin: props.midiMin,
    midiMax: props.midiMax,
  })
}

/* Emitted whenever a key plays, so the parent can arm the preview deaf period
 * (stops the piano's own tone registering as sung pitch). */
const emit = defineEmits<{ tonePlayed: [] }>()

const { pressCountFor, playKey, handleKeyDown } = usePianoKeyPlayback({
  onTonePlayed: () => emit('tonePlayed'),
})

/* A pressed key washes green, then fades back out. Slower than the flash used
 * elsewhere (TONE_CLICK_HIGHLIGHT_DURATION_MS) so the tail reads as a fade
 * rather than a flicker. */
const KEY_GLOW_DURATION_MS = 1200
const keyGlowDuration = `${KEY_GLOW_DURATION_MS}ms`

/* Fade curve, written out rather than as `ease-in` so it can be tweaked by
 * number: x1 is how long the green holds before opacity starts moving (0.42 =
 * plain ease-in, 0.7 holds most of the duration then drops hard), y1 pulls the
 * early fade down if 0 holds too flat. The end pair stays (1, 1) so the drop
 * runs out at full speed instead of easing to a stop. */
const keyGlowEasing = 'cubic-bezier(0.42, 0, 1, 1)'

/* Computer-keyboard playing: Z…M is the C3 octave, Q…U the C4 one, regardless
 * of the selected range (see pianoKeyboardMap). */
const {
  keyboardCharForMidi,
  octaveShiftOptions,
  stepOctaveShift,
  canShiftDown,
  canShiftUp,
  anchor,
} = usePianoKeyboardInput({
  midiMin: () => props.midiMin,
  midiMax: () => props.midiMax,
  onPlay: (midi) => void playKey(midi),
})

/*
 * Fit-to-container key sizing. The scroll box is w-full, so its width comes
 * from the parent and can't feed back from its own content — safe to observe
 * directly (unlike the w-fit abcjs sheets, which observe their parent).
 */
const scrollBox = useTemplateRef<HTMLElement>('scrollBox')
const containerWidth = ref(0)
useResizeObserver(scrollBox, ([entry]) => {
  containerWidth.value = entry.contentRect.width
})

const isCoarsePointer = useMediaQuery('(pointer: coarse)')

/* Grow the keys to fill the container, bounded by a tap-target floor (larger on
 * touch) and a life-size ceiling. Wide ranges hit the floor and scroll. */
const semitoneUnit = computed(() => {
  const minUnit = isCoarsePointer.value
    ? MIN_SEMITONE_UNIT_TOUCH
    : MIN_SEMITONE_UNIT_POINTER
  /* Before the first ResizeObserver callback there is nothing to fit to. */
  if (!containerWidth.value) return minUnit

  const fitted =
    containerWidth.value / pianoSpanUnits(props.midiMin, props.midiMax)

  /* Floor to whole px so a fractional remainder can't overflow by a hair and
   * trigger a scrollbar on a keyboard that was meant to fit. */
  return Math.floor(Math.min(Math.max(fitted, minUnit), MAX_SEMITONE_UNIT))
})

/* Printed only where a physical keyboard exists — on touch the chars are noise. */
function keyChar(key: PianoKey): string | null {
  if (isCoarsePointer.value) return null

  return keyboardCharForMidi(key.midi)
}

/* Only worth showing where shifting can reach notes the printed layout cannot,
 * and only where there is a keyboard to shift. */
const isOctaveShiftVisible = computed(
  () => !isCoarsePointer.value && octaveShiftOptions.value.length > 1,
)

const layout = computed(() =>
  buildPianoLayout(props.midiMin, props.midiMax, semitoneUnit.value),
)

const blackKeyHeight = WHITE_KEY_HEIGHT * BLACK_KEY_HEIGHT_RATIO
const trackHeight = WHITE_KEY_HEIGHT + PIANO_LABEL_BAND_HEIGHT

/* Pitch hint lines poke this far above the key tops into the label band, so
 * their top ends form one row — the equal semitone spacing reads at a glance. */
const PITCH_HINT_TICK_HEIGHT = 8 // px

/* The fitted unit is floored to whole px, so a keyboard that was meant to fit
 * never exceeds the container — a positive difference means it really scrolls. */
const isScrollable = computed(
  () =>
    containerWidth.value > 0 && layout.value.totalWidth > containerWidth.value,
)

/* Somewhere to start a pan that is not a key: @pointerdown sounds a note on the
 * first touch of a drag, so panning by the keys plays them by accident. Pointless
 * without a touch gesture (mouse users get the scrollbar) or where the whole
 * keyboard already fits. */
const isDragGutterVisible = computed(
  () => isCoarsePointer.value && isScrollable.value,
)

/* Vertical line + note/cents chip per lane, mapped from the live pitch. Lanes
 * with no clean pitch drop out, so this is empty while nobody is singing. */
const previewLines = computed(() =>
  buildPianoPreviewLines(
    (props.previewLanes ?? []).map((lane) => ({
      ...lane,
      layout: layout.value,
    })),
  ),
)

/* Two lines in the same colour are impossible to tell apart, so the high band
 * gets its own hue. Orange stays with the low/only lane, matching the
 * single-voice preview this grew out of. */
const LANE_COLOUR_CLASS: Record<
  PianoPreviewLaneId,
  { line: string; chip: string }
> = {
  low: { line: 'border-(--p-orange-400)/50', chip: 'text-(--p-orange-400)' },
  high: { line: 'border-(--p-blue-400)/50', chip: 'text-(--p-blue-400)' },
}

/* px — vertical step between the two chip rows. The label band is 28px and a
 * chip is ~12px tall, so row 1 sits just clear of the key tops. */
const PREVIEW_LABEL_ROW_HEIGHT = 12
</script>

<template>
  <div class="flex w-full flex-col gap-1">
    <!-- Outside the scroll box on purpose: inside it, the control would scroll
         away from the keys it moves on a wide range. -->
    <PianoOctaveShift
      v-if="isOctaveShiftVisible"
      :char="anchor.char"
      :noteLabel="anchor.noteLabel"
      :canShiftDown="canShiftDown"
      :canShiftUp="canShiftUp"
      @shift="stepOctaveShift"
    />

    <div class="relative w-full">
      <!-- A piano is a fixed physical instrument (low pitch always on the left), so
         force LTR even in RTL locales; inline-start then coincides with left.
         The gutter is padding on the scroll box rather than a strip inside it:
         padding belongs to the container, not the scrolled content, so it stays
         put however far the keys are scrolled. contentRect.width excludes it,
         so containerWidth (and with it the fitted key size) is unaffected. -->
      <div
        ref="scrollBox"
        class="w-full overflow-x-auto"
        :style="{
          paddingBlockEnd: isDragGutterVisible
            ? `${PIANO_DRAG_GUTTER_HEIGHT}px`
            : undefined,
        }"
        dir="ltr"
        data-testid="piano-display"
      >
        <div
          class="relative mx-auto"
          :style="{
            width: `${layout.totalWidth}px`,
            height: `${trackHeight}px`,
          }"
        >
          <button
            v-for="key in layout.whites"
            :key="key.midi"
            type="button"
            class="absolute bottom-0 touch-manipulation rounded-b-md border border-(--p-content-border-color) bg-(--p-surface-0) text-xs text-(--p-text-muted-color) transition-colors select-none hover:bg-(--p-surface-100)"
            :style="{
              insetInlineStart: `${key.leftPx}px`,
              width: `${key.widthPx}px`,
              height: `${WHITE_KEY_HEIGHT}px`,
            }"
            :data-testid="`piano-key-${key.midi}`"
            :aria-label="midiToNoteLabel(key.midi).label"
            :aria-keyshortcuts="keyboardCharForMidi(key.midi) ?? undefined"
            @pointerdown="playKey(key.midi)"
            @keydown="handleKeyDown($event, key.midi)"
          >
            <!-- Press highlight. Keyed on the press count so a fresh press
             remounts the element and replays the fade from full colour; an
             opacity transition would instead be a no-op while already lit. -->
            <span
              v-if="pressCountFor(key.midi)"
              :key="`glow-${pressCountFor(key.midi)}`"
              class="piano-key-glow pointer-events-none absolute inset-0 rounded-b-md bg-(--p-primary-color)"
              aria-hidden="true"
            />

            <!-- Sits on the key's pitch position, not its rectangle center, so the
             label lines up with the hint line (they differ on C/E/F/B). -->
            <span
              v-if="keyLabel(key)"
              class="absolute bottom-1 -translate-x-1/2"
              :style="{ insetInlineStart: `${key.pitchX - key.leftPx}px` }"
            >
              {{ keyLabel(key) }}
            </span>

            <!-- The computer key that plays this note. Fixed height above the note
             label so the chars read as one row across the keyboard whether or
             not a given key carries a label. aria-keyshortcuts on the button
             already announces it, hence aria-hidden here. -->
            <span
              v-if="keyChar(key)"
              class="absolute bottom-6 -translate-x-1/2 rounded border border-(--p-content-border-color) px-1 text-[10px] leading-4 text-(--p-text-muted-color)"
              :style="{ insetInlineStart: `${key.pitchX - key.leftPx}px` }"
              aria-hidden="true"
            >
              {{ keyChar(key) }}
            </span>
          </button>

          <button
            v-for="key in layout.blacks"
            :key="key.midi"
            type="button"
            class="absolute z-10 flex touch-manipulation flex-col items-center justify-end gap-1 rounded-b-md border border-(--p-surface-950) bg-(--p-surface-900) pb-1 transition-colors select-none hover:bg-(--p-surface-700)"
            :style="{
              insetInlineStart: `${key.leftPx}px`,
              top: `${PIANO_LABEL_BAND_HEIGHT}px`,
              width: `${key.widthPx}px`,
              height: `${blackKeyHeight}px`,
            }"
            :data-testid="`piano-key-${key.midi}`"
            :aria-label="midiToNoteLabel(key.midi).label"
            :aria-keyshortcuts="keyboardCharForMidi(key.midi) ?? undefined"
            @pointerdown="playKey(key.midi)"
            @keydown="handleKeyDown($event, key.midi)"
          >
            <span
              v-if="pressCountFor(key.midi)"
              :key="`glow-${pressCountFor(key.midi)}`"
              class="piano-key-glow pointer-events-none absolute inset-0 rounded-b-md bg-(--p-primary-color)"
              aria-hidden="true"
            />

            <!-- Stacked bottom-up: the computer key sits above the note label.
             relative keeps both labels painted above the glow overlay. -->
            <span
              v-if="keyChar(key)"
              class="relative rounded border border-(--p-surface-600) px-1 text-[10px] leading-4 text-(--p-surface-300)"
              aria-hidden="true"
            >
              {{ keyChar(key) }}
            </span>

            <span
              v-if="keyLabel(key)"
              class="relative text-[10px] leading-none text-(--p-surface-0)"
            >
              {{ keyLabel(key) }}
            </span>
          </button>

          <!-- Pitch hint lines: a thin green line down each key's pitch position,
           shown only while "See your voice" is on. Green is the app's on-pitch
           colour (NotesSheet, DoReMiScaleItem), so landing the orange live-pitch
           line on a green one reads as in-tune. The shade differs per key so the
           line stays legible on both backgrounds: 500 on the white keys, 400 on
           the dark black keys.
           Consecutive lines are exactly one semitone unit apart, so the
           live-pitch line travels at a constant px-per-cent. On C/E/F/B the line
           sits a quarter unit off the rectangle center — those keys are
           asymmetric around their pitch (see pianoLayout).
           Every line also gets a short solid tick above the keys: white and
           black key tops share one y, so the ticks land on a single row against
           the flat label band, where the even semitone spacing is obvious. -->
          <template v-if="isPreviewEnabled">
            <div
              v-for="key in layout.whites"
              :key="`hint-${key.midi}`"
              class="pointer-events-none absolute bottom-0 z-[5] w-0 -translate-x-[0.5px] border-l border-dotted border-(--p-green-500)"
              :style="{
                insetInlineStart: `${key.pitchX}px`,
                height: `${WHITE_KEY_HEIGHT}px`,
              }"
            />
            <div
              v-for="key in layout.blacks"
              :key="`hint-${key.midi}`"
              class="pointer-events-none absolute z-[15] w-0 -translate-x-[0.5px] border-l border-dotted border-(--p-green-400)"
              :style="{
                insetInlineStart: `${key.pitchX}px`,
                top: `${PIANO_LABEL_BAND_HEIGHT}px`,
                height: `${blackKeyHeight}px`,
              }"
            />
            <div
              v-for="key in [...layout.whites, ...layout.blacks]"
              :key="`tick-${key.midi}`"
              class="pointer-events-none absolute z-[15] w-0 -translate-x-[0.5px] border-l border-solid border-(--p-green-500)"
              :style="{
                insetInlineStart: `${key.pitchX}px`,
                top: `${PIANO_LABEL_BAND_HEIGHT - PITCH_HINT_TICK_HEIGHT}px`,
                height: `${PITCH_HINT_TICK_HEIGHT}px`,
              }"
            />
          </template>

          <!-- Live-pitch overlay: a vertical dashed line spanning the track per
           singing voice, with a note/cents chip in the top band. Orange is the
           low/only voice, blue the high one in duet mode. Chips that would
           collide stack onto a second row (see buildPianoPreviewLines).
           pointer-events-none keeps the keys underneath clickable. -->
          <template v-for="line in previewLines" :key="line.laneId">
            <div
              class="pointer-events-none absolute inset-y-0 z-20 w-0 -translate-x-[1.5px] border-l-3 border-dashed"
              :class="LANE_COLOUR_CLASS[line.laneId].line"
              :style="{ insetInlineStart: `${line.x}px` }"
              data-testid="piano-preview-line"
              :data-lane="line.laneId"
            />
            <span
              class="pointer-events-none absolute z-30 -translate-x-1/2 rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold tabular-nums"
              :class="LANE_COLOUR_CLASS[line.laneId].chip"
              :style="{
                insetInlineStart: `${line.x}px`,
                top: `${4 + line.labelRow * PREVIEW_LABEL_ROW_HEIGHT}px`,
              }"
              data-testid="piano-preview-label"
              :data-lane="line.laneId"
            >
              {{ line.text }}
            </span>
          </template>
        </div>
      </div>

      <!-- The gutter, painted so the safe area is visible: a grey strip with a
           drag handle. pointer-events-none so the touch lands on the scroll box
           underneath and the browser pans it natively. -->
      <div
        v-if="isDragGutterVisible"
        class="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-center rounded-b-md bg-(--p-surface-100) dark:bg-(--p-surface-800)"
        :style="{ height: `${PIANO_DRAG_GUTTER_HEIGHT}px` }"
        aria-hidden="true"
        data-testid="piano-drag-gutter"
      >
        <span
          class="h-1.5 w-16 rounded-full bg-(--p-surface-400) dark:bg-(--p-surface-600)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Solid for the first beat (so the press reads as a hit), then out. */
@keyframes piano-key-glow {
  0%,
  15% {
    opacity: 1;
  }
  100% {
    opacity: 0;
  }
}

.piano-key-glow {
  /* The curve is ease-in shaped: opacity barely moves early on, so the green
   * holds, then drops away quickly. See keyGlowEasing for the control points. */
  animation: piano-key-glow v-bind(keyGlowDuration) v-bind(keyGlowEasing)
    forwards;
}
</style>

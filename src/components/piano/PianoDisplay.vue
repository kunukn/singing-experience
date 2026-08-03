<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { useMediaQuery, useResizeObserver } from '@vueuse/core'
import {
  BLACK_KEY_HEIGHT_RATIO,
  MAX_SEMITONE_UNIT,
  MIN_SEMITONE_UNIT_POINTER,
  MIN_SEMITONE_UNIT_TOUCH,
  PIANO_LABEL_BAND_HEIGHT,
  WHITE_KEY_HEIGHT,
  buildPianoLayout,
  pianoSpanUnits,
  type PianoKey,
} from './pianoLayout'
import { pianoKeyLabel } from './pianoLabels'
import { buildPianoPreviewLine } from './pianoPreview'
import { usePianoKeyPlayback } from './usePianoKeyPlayback'
import { usePianoKeyboardInput } from './usePianoKeyboardInput'
import PianoOctaveShift from './PianoOctaveShift.vue'

type Props = {
  midiMin: number
  midiMax: number
  /* Live mic preview (from useIdlePreview via PianoPage). null when disabled or
   * no clean pitch. */
  previewMidi?: number | null
  previewFrequency?: number | null
  previewNoteLabel?: string | null
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

const { activeMidis, playKey, handleKeyDown } = usePianoKeyPlayback({
  onTonePlayed: () => emit('tonePlayed'),
})

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

/* Vertical orange line + note/cents chip mapped from the live pitch; null hides. */
const previewLine = computed(() =>
  buildPianoPreviewLine({
    previewMidi: props.previewMidi ?? null,
    previewFrequency: props.previewFrequency ?? null,
    previewNoteLabel: props.previewNoteLabel ?? null,
    layout: layout.value,
  }),
)
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

    <!-- A piano is a fixed physical instrument (low pitch always on the left), so
         force LTR even in RTL locales; inline-start then coincides with left. -->
    <div
      ref="scrollBox"
      class="w-full overflow-x-auto"
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
          class="absolute bottom-0 touch-manipulation rounded-b-md border border-(--p-content-border-color) text-xs transition-colors select-none"
          :class="
            activeMidis.has(key.midi)
              ? 'bg-(--p-primary-color) text-(--p-primary-contrast-color)'
              : 'bg-(--p-surface-0) text-(--p-text-muted-color) hover:bg-(--p-surface-100)'
          "
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
          class="absolute z-10 flex touch-manipulation flex-col items-center justify-end gap-1 rounded-b-md border border-(--p-surface-950) pb-1 transition-colors select-none"
          :class="
            activeMidis.has(key.midi)
              ? 'bg-(--p-primary-color)'
              : 'bg-(--p-surface-900) hover:bg-(--p-surface-700)'
          "
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
          <!-- Stacked bottom-up: the computer key sits above the note label. -->
          <span
            v-if="keyChar(key)"
            class="rounded border border-(--p-surface-600) px-1 text-[10px] leading-4 text-(--p-surface-300)"
            aria-hidden="true"
          >
            {{ keyChar(key) }}
          </span>

          <span
            v-if="keyLabel(key)"
            class="text-[10px] leading-none text-(--p-surface-0)"
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
           asymmetric around their pitch (see pianoLayout). -->
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
        </template>

        <!-- Live-pitch overlay: vertical dashed orange line spanning the track,
           with a note/cents chip in the top band. pointer-events-none keeps the
           keys underneath clickable. -->
        <template v-if="previewLine">
          <div
            class="pointer-events-none absolute inset-y-0 z-20 w-0 -translate-x-[1.5px] border-l-3 border-dashed border-(--p-orange-400)/50"
            :style="{ insetInlineStart: `${previewLine.x}px` }"
            data-testid="piano-preview-line"
          />
          <span
            class="pointer-events-none absolute z-30 -translate-x-1/2 rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-orange-400) tabular-nums"
            :style="{ insetInlineStart: `${previewLine.x}px`, top: '4px' }"
            data-testid="piano-preview-label"
          >
            {{ previewLine.text }}
          </span>
        </template>
      </div>
    </div>
  </div>
</template>

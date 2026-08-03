<script setup lang="ts">
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import {
  TONE_CLICK_HIGHLIGHT_DURATION_MS,
  TONE_PLAY_DURATION_S,
} from '@/constants/toneConstants'
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
import { buildPianoPreviewLine } from './pianoPreview'

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

/* The two range boundaries always get a label, so the singer sees where the
 * selected voice range starts and ends (e.g. A3 / A5 for Mezzo-Soprano). */
function isRangeEdge(key: PianoKey): boolean {
  return key.midi === props.midiMin || key.midi === props.midiMax
}

/* White-key label for the current mode: in 'off' the C-key octave markers
 * (key.label) and the range edges show; otherwise every key shows its name, with
 * the octave digit in 'advanced'. */
function whiteKeyLabel(key: PianoKey): string | null {
  const mode = props.toneLabelMode ?? 'off'
  if (mode === 'off') {
    if (key.label) return key.label
    if (isRangeEdge(key))
      return midiToNoteLabel(key.midi, { showOctave: true }).label

    return null
  }

  return midiToNoteLabel(key.midi, { showOctave: mode === 'advanced' }).label
}

/* Black keys carry no octave marker, so in 'off' they show a label only when
 * they are a range edge. */
function blackKeyLabel(key: PianoKey): string | null {
  const mode = props.toneLabelMode ?? 'off'
  if (mode === 'off') {
    if (isRangeEdge(key))
      return midiToNoteLabel(key.midi, { showOctave: true }).label

    return null
  }

  return midiToNoteLabel(key.midi, { showOctave: mode === 'advanced' }).label
}

/* Emitted whenever a key plays, so the parent can arm the preview deaf period
 * (stops the piano's own tone registering as sung pitch). */
const emit = defineEmits<{ tonePlayed: [] }>()

/* playToneAt is polyphonic — it reuses the current mode's PolySynth and does not
 * cut the previous note, so several keys ring together (a chord). Bass mode is a
 * MonoSynth, so it stays monophonic there. */
const { playToneAt, warmUp, getNow } = useTonePlayer()

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

/* Multiple keys can be lit at once (multi-touch chords). */
const activeMidis = reactive(new Set<number>())
const highlightTimers = new Map<number, ReturnType<typeof setTimeout>>()

async function playKey(midi: number) {
  activeMidis.add(midi)
  const existing = highlightTimers.get(midi)
  if (existing) clearTimeout(existing)

  highlightTimers.set(
    midi,
    window.setTimeout(() => {
      activeMidis.delete(midi)
      highlightTimers.delete(midi)
    }, TONE_CLICK_HIGHLIGHT_DURATION_MS),
  )

  /* warmUp resolves the AudioContext within the press gesture (cached after the
   * first press); playToneAt needs it running and doesn't self-start. */
  await warmUp()
  playToneAt(midiToFrequency(midi), TONE_PLAY_DURATION_S, getNow())
  emit('tonePlayed')
}

/* Keyboard access: a <button> fires no pointerdown for Enter/Space, so play on
 * those keys too (ignoring auto-repeat while held). */
function handleKeyDown(event: KeyboardEvent, midi: number) {
  if (event.repeat) return
  if (event.key !== 'Enter' && event.key !== ' ') return

  event.preventDefault()
  void playKey(midi)
}

onUnmounted(() => {
  for (const timer of highlightTimers.values()) clearTimeout(timer)
  highlightTimers.clear()
})
</script>

<template>
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
        class="absolute bottom-0 flex touch-manipulation items-end justify-center rounded-b-md border border-(--p-content-border-color) pb-1 text-xs transition-colors select-none"
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
        @pointerdown="playKey(key.midi)"
        @keydown="handleKeyDown($event, key.midi)"
      >
        <span v-if="whiteKeyLabel(key)">
          {{ whiteKeyLabel(key) }}
        </span>
      </button>

      <button
        v-for="key in layout.blacks"
        :key="key.midi"
        type="button"
        class="absolute z-10 flex touch-manipulation items-end justify-center rounded-b-md border border-(--p-surface-950) pb-1 transition-colors select-none"
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
        @pointerdown="playKey(key.midi)"
        @keydown="handleKeyDown($event, key.midi)"
      >
        <span
          v-if="blackKeyLabel(key)"
          class="text-[10px] leading-none text-(--p-surface-0)"
        >
          {{ blackKeyLabel(key) }}
        </span>
      </button>

      <!-- Dead-center hint lines: a thin grey line down each key's true center,
           shown only while "See your voice" is on. The live-pitch line lands on
           these when the singer is in tune. -->
      <template v-if="isPreviewEnabled">
        <div
          v-for="key in layout.whites"
          :key="`hint-${key.midi}`"
          class="pointer-events-none absolute bottom-0 z-[5] w-0 -translate-x-[0.5px] border-l border-dotted border-(--p-surface-300)"
          :style="{
            insetInlineStart: `${key.centerX}px`,
            height: `${WHITE_KEY_HEIGHT}px`,
          }"
        />
        <div
          v-for="key in layout.blacks"
          :key="`hint-${key.midi}`"
          class="pointer-events-none absolute z-[15] w-0 -translate-x-[0.5px] border-l border-dotted border-(--p-surface-500)"
          :style="{
            insetInlineStart: `${key.centerX}px`,
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
</template>

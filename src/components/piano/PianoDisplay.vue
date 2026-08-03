<script setup lang="ts">
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import {
  BLACK_KEY_HEIGHT_RATIO,
  PIANO_LABEL_BAND_HEIGHT,
  WHITE_KEY_HEIGHT,
  buildPianoLayout,
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
}
const props = defineProps<Props>()

/* Emitted whenever a key plays, so the parent can arm the preview deaf period
 * (stops the piano's own tone registering as sung pitch). */
const emit = defineEmits<{ tonePlayed: [] }>()

const { playTone } = useTonePlayer()

const layout = computed(() => buildPianoLayout(props.midiMin, props.midiMax))

const blackKeyHeight = WHITE_KEY_HEIGHT * BLACK_KEY_HEIGHT_RATIO
const trackHeight = WHITE_KEY_HEIGHT + PIANO_LABEL_BAND_HEIGHT

/* Vertical orange line + note/cents chip mapped from the live pitch; null hides. */
const previewLine = computed(() =>
  buildPianoPreviewLine({
    previewMidi: props.previewMidi ?? null,
    previewFrequency: props.previewFrequency ?? null,
    previewNoteLabel: props.previewNoteLabel ?? null,
    midiMin: props.midiMin,
    midiMax: props.midiMax,
    originPitch: layout.value.originPitch,
    unit: layout.value.unit,
    totalWidth: layout.value.totalWidth,
  }),
)

const activeMidi = ref<number | null>(null)

function playKey(midi: number) {
  activeMidi.value = midi
  /* playTone honors the globally-selected tone mode (set by PianoPage via
   * setToneMode) and takes a frequency, so convert from MIDI. A key click is a
   * user gesture, so the AudioContext self-starts inside playTone. */
  playTone(midiToFrequency(midi))
  emit('tonePlayed')
  window.setTimeout(() => {
    if (activeMidi.value === midi) activeMidi.value = null
  }, TONE_CLICK_HIGHLIGHT_DURATION_MS)
}
</script>

<template>
  <!-- A piano is a fixed physical instrument (low pitch always on the left), so
       force LTR even in RTL locales; inline-start then coincides with left. -->
  <div class="w-full overflow-x-auto" dir="ltr" data-testid="piano-display">
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
        class="absolute bottom-0 flex items-end justify-center rounded-b-md border border-(--p-content-border-color) pb-1 text-xs transition-colors"
        :class="
          activeMidi === key.midi
            ? 'bg-(--p-primary-color) text-(--p-primary-contrast-color)'
            : 'bg-(--p-surface-0) text-(--p-text-muted-color)'
        "
        :style="{
          insetInlineStart: `${key.leftPx}px`,
          width: `${key.widthPx}px`,
          height: `${WHITE_KEY_HEIGHT}px`,
        }"
        :data-testid="`piano-key-${key.midi}`"
        :aria-label="midiToNoteLabel(key.midi).label"
        @click="playKey(key.midi)"
      >
        <span v-if="key.label">{{ key.label }}</span>
      </button>

      <button
        v-for="key in layout.blacks"
        :key="key.midi"
        type="button"
        class="absolute z-10 rounded-b-md border border-(--p-surface-950)"
        :class="
          activeMidi === key.midi
            ? 'bg-(--p-primary-color)'
            : 'bg-(--p-surface-900)'
        "
        :style="{
          insetInlineStart: `${key.leftPx}px`,
          top: `${PIANO_LABEL_BAND_HEIGHT}px`,
          width: `${key.widthPx}px`,
          height: `${blackKeyHeight}px`,
        }"
        :data-testid="`piano-key-${key.midi}`"
        :aria-label="midiToNoteLabel(key.midi).label"
        @click="playKey(key.midi)"
      />

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

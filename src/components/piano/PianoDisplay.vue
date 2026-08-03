<script setup lang="ts">
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import {
  BLACK_KEY_HEIGHT_RATIO,
  WHITE_KEY_HEIGHT,
  buildPianoLayout,
} from './pianoLayout'

type Props = { midiMin: number; midiMax: number }
const props = defineProps<Props>()

const { playTone } = useTonePlayer()

const layout = computed(() => buildPianoLayout(props.midiMin, props.midiMax))

const blackKeyHeight = WHITE_KEY_HEIGHT * BLACK_KEY_HEIGHT_RATIO

const activeMidi = ref<number | null>(null)

function playKey(midi: number) {
  activeMidi.value = midi
  /* playTone honors the globally-selected tone mode (set by PianoPage via
   * setToneMode) and takes a frequency, so convert from MIDI. A key click is a
   * user gesture, so the AudioContext self-starts inside playTone. */
  playTone(midiToFrequency(midi))
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
        height: `${WHITE_KEY_HEIGHT}px`,
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
        class="absolute top-0 z-10 rounded-b-md border border-(--p-surface-950)"
        :class="
          activeMidi === key.midi
            ? 'bg-(--p-primary-color)'
            : 'bg-(--p-surface-900)'
        "
        :style="{
          insetInlineStart: `${key.leftPx}px`,
          width: `${key.widthPx}px`,
          height: `${blackKeyHeight}px`,
        }"
        :data-testid="`piano-key-${key.midi}`"
        :aria-label="midiToNoteLabel(key.midi).label"
        @click="playKey(key.midi)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'

import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'

import TakeKeyScale from './TakeKeyScale.vue'
import type { NoteUse, TakeKey } from './analyzeTake'

type Props = {
  notesUsed: NoteUse[]
  takeKey: TakeKey | null
}

const props = defineProps<Props>()

/* A note or the scale is about to sound, so the take should stop playing. */
const emit = defineEmits<{
  tonePlay: []
}>()

const { t, locale } = useI18n()

/* Set here too: without a likely key there's no TakeKeyScale to set it. */
const { playTone, setToneMode } = useTonePlayer()
const { toneMode } = storeToRefs(useToneModeStore())
setToneMode(toneMode.value)

const soundingMidi = ref<number | null>(null)
const { start: startHighlightTimer } = useTimeoutFn(
  () => {
    soundingMidi.value = null
  },
  TONE_CLICK_HIGHLIGHT_DURATION_MS,
  { immediate: false },
)

/* "I sang G3 most — what does G3 sound like?" */
function playNote(midi: number) {
  emit('tonePlay')
  soundingMidi.value = midi
  startHighlightTimer()
  void playTone(midiToFrequency(midi))
}

const longestMs = computed(() =>
  Math.max(1, ...props.notesUsed.map((use) => use.totalMs)),
)
const secondsFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      maximumFractionDigits: 1,
    }),
)
const rows = computed(() =>
  props.notesUsed.map((use) => ({
    midi: use.midi,
    label: midiToNoteLabel(use.midi).label,
    time: secondsFormat.value.format(use.totalMs / 1000),
    widthPercent: (use.totalMs / longestMs.value) * 100,
  })),
)
</script>

<template>
  <section class="flex flex-col gap-2" data-testid="notes-used">
    <h2 class="text-sm font-semibold">
      {{ t('voiceRecorder.notes.title') }}
    </h2>
    <TakeKeyScale
      v-if="takeKey"
      :takeKey="takeKey"
      :notesUsed="notesUsed"
      @play="emit('tonePlay')"
    />
    <ul class="flex flex-col gap-0.5">
      <li
        v-for="row in rows"
        :key="row.midi"
        class="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2 text-xs"
        data-testid="notes-used-row"
        :data-playing="soundingMidi === row.midi"
      >
        <!-- A plain button, as the pitch charts' note labels are: it has to stay
             text-sized inside the row, which PrimeButton would fight. The dotted
             underline says it can be tapped. text-sm's 20px line height makes the
             tap area 20px tall; -my-0.5 keeps the row laid out at 16px -->
        <button
          type="button"
          :aria-label="t('voiceRecorder.notes.playNote', { note: row.label })"
          :title="t('voiceRecorder.notes.playNote', { note: row.label })"
          class="-my-0.5 cursor-pointer justify-self-start text-sm tabular-nums underline decoration-dotted underline-offset-2"
          :class="
            soundingMidi === row.midi
              ? 'text-(--p-primary-color)'
              : 'text-(--p-text-color)'
          "
          dir="ltr"
          data-testid="notes-used-play"
          @click="playNote(row.midi)"
        >
          {{ row.label }}
        </button>
        <span class="h-2.5">
          <span
            class="block h-full rounded-e bg-(--p-primary-color)"
            :style="{ width: `${row.widthPercent}%` }"
          />
        </span>
        <span class="text-end text-(--p-text-muted-color) tabular-nums">
          {{ row.time }}
        </span>
      </li>
    </ul>
  </section>
</template>

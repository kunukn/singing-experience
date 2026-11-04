<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'

import TakeKeyScale from './TakeKeyScale.vue'
import type { NoteUse, TakeKey } from './analyzeTake'

type Props = {
  notesUsed: NoteUse[]
  takeKey: TakeKey | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  scalePlay: []
}>()

const { t, locale } = useI18n()

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
      @play="emit('scalePlay')"
    />
    <ul class="flex flex-col gap-0.5">
      <li
        v-for="row in rows"
        :key="row.midi"
        class="grid grid-cols-[3rem_1fr_3.5rem] items-center gap-2 text-xs"
        data-testid="notes-used-row"
      >
        <span class="tabular-nums" dir="ltr">{{ row.label }}</span>
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

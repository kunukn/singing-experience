<script setup lang="ts">
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_OPTIONS_HIGH_TO_LOW } from '@/utils/noteUtils'
import TunerDisplay from './TunerDisplay.vue'

const { t } = useI18n()

const selectedNote = ref<NoteName>('A')
const selectedOctave = ref(4)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

const {
  frequency,
  noteInfo,
  clarity,
  isListening,
  isClean,
  error,
  start,
  stop,
} = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})
</script>

<template>
  <div class="flex flex-col items-center gap-4">
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>🎸</span>
      <span>{{ t('tuner.tuning') }} (Test)</span>
    </h1>

    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Note</label>
        <PrimeSelect
          v-model="selectedNote"
          :options="[...NOTE_OPTIONS_HIGH_TO_LOW]"
          optionLabel="label"
          optionValue="value"
          class="min-w-20"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Octave</label>
        <PrimeSelect
          v-model="selectedOctave"
          :options="[2, 3, 4, 5, 6].toReversed()"
          class="min-w-16"
        />
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Cents: {{ selectedCents > 0 ? '+' : '' }}{{ selectedCents }}
        </label>
        <input
          v-model.number="selectedCents"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full"
        />
      </div>

      <div class="flex min-w-32 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Clarity: {{ Math.round(selectedClarity * 100) }}%
        </label>
        <input
          v-model.number="selectedClarity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full"
        />
      </div>

      <div class="flex min-w-28 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Jitter: ±{{ selectedJitter }}¢
        </label>
        <input
          v-model.number="selectedJitter"
          type="range"
          min="0"
          max="20"
          step="1"
          class="w-full"
        />
      </div>
    </div>

    <TunerDisplay
      :noteInfo="noteInfo"
      :frequency="frequency"
      :clarity="clarity"
      :isClean="isClean"
      :isListening="isListening"
      :error="error"
      :start="start"
      :stop="stop"
    />
  </div>
</template>

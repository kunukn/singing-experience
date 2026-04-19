<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import PitchDetectorDisplay from './PitchDetectorDisplay.vue'

const { toneMode } = useTonePlayer()
const selectedToneMode = ref<ToneMode>(toneMode.value)
const selectedRangeIndex = ref(4)

const selectedNote = ref<NoteName>('B')
const selectedOctave = ref(3)
const selectedCents = ref(20)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})
</script>

<template>
  <PitchDetectorDisplay
    :detection="detection"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:toneMode="selectedToneMode"
  >
    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-gray-800/50 p-4"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Note</label>
        <Select v-model="selectedNote" class="min-w-20">
          <option
            v-for="note in [...NOTE_NAMES].reverse()"
            :key="note"
            :value="note"
          >
            {{ note }}
          </option>
        </Select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Octave</label>
        <Select v-model.number="selectedOctave" class="min-w-16">
          <option
            v-for="oct in [2, 3, 4, 5, 6].reverse()"
            :key="oct"
            :value="oct"
          >
            {{ oct }}
          </option>
        </Select>
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-gray-400">
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
        <label class="text-xs text-gray-400">
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
        <label class="text-xs text-gray-400">
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
  </PitchDetectorDisplay>
</template>

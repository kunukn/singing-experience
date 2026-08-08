<script setup lang="ts">
import type { NoteName } from '@/utils/noteUtils'
import {
  midiToFrequency,
  NOTE_NAMES,
  NOTE_OPTIONS_HIGH_TO_LOW,
} from '@/utils/noteUtils'
import PitchGameDisplay from './PitchGameDisplay.vue'

const selectedRangeIndex = ref(4)
const selectedHoldDurationSec = ref(0.05)
const selectedGameDurationSec = ref(10)

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

const { isPreviewEnabled } = useSettings()

const isIdle = computed(() => !detection.isListening.value)

const overridePreviewMidi = computed(() => {
  if (!isIdle.value || !isPreviewEnabled.value) return null

  return (
    (selectedOctave.value + 1) * 12 + NOTE_NAMES.indexOf(selectedNote.value)
  )
})

const overridePreviewNoteLabel = computed(() => {
  if (!isIdle.value || !isPreviewEnabled.value) return null

  return `${selectedNote.value}${selectedOctave.value}`
})

/* Frequency derived from the integer MIDI plus simulated cents offset, so the
 * canvas can display the cents deviation next to the note label. */
const overridePreviewFrequency = computed(() => {
  if (overridePreviewMidi.value === null) return null

  // 100 cents = one semitone
  return midiToFrequency(overridePreviewMidi.value + selectedCents.value / 100)
})
</script>

<template>
  <PitchGameDisplay
    :detection="detection"
    :overridePreviewMidi="overridePreviewMidi"
    :overridePreviewNoteLabel="overridePreviewNoteLabel"
    :overridePreviewFrequency="overridePreviewFrequency"
    :disableIdlePreview="true"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:holdDurationSec="selectedHoldDurationSec"
    v-model:gameDurationSec="selectedGameDurationSec"
  >
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
          :options="[2, 3, 4, 5, 6].reverse()"
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
  </PitchGameDisplay>
</template>

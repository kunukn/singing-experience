<script setup lang="ts">
import { NOTE_OPTIONS_HIGH_TO_LOW, type NoteName } from '@/utils/noteUtils'
import VoiceRangeFinderDisplay from './VoiceRangeFinderDisplay.vue'

/* Simulated voice only — test pages never open the microphone (AGENTS.md). */

const VOICE_ON_CLARITY = 0.95
const VOICE_OFF_CLARITY = 0

const selectedNote = ref<NoteName>('G')
const selectedOctave = ref(2)
const selectedCents = ref(0)
const selectedClarity = ref(VOICE_ON_CLARITY)
const selectedJitter = ref(2)

const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

const isVoiceOn = computed({
  get: () => selectedClarity.value >= VOICE_ON_CLARITY,
  set: (isOn) => {
    selectedClarity.value = isOn ? VOICE_ON_CLARITY : VOICE_OFF_CLARITY
  },
})

/* C2 to C7, the span My range is allowed in */
const octaveOptions = [7, 6, 5, 4, 3, 2]
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <h1 class="text-2xl font-semibold">
      {{ $t('home.programs.voiceRangeFinder.name') }} (Test)
    </h1>

    <div
      class="flex w-full max-w-md flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
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
          :options="octaveOptions"
          class="min-w-16"
        />
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Cents: {{ selectedCents > 0 ? '+' : '' }}{{ selectedCents }}
        </label>
        <PrimeSlider v-model="selectedCents" :min="-50" :max="50" />
      </div>

      <label class="flex items-center gap-2 text-sm">
        <PrimeToggleSwitch v-model="isVoiceOn" />
        Voice
      </label>
    </div>

    <VoiceRangeFinderDisplay :detection="detection" />
  </div>
</template>

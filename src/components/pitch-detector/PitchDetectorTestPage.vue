<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import PitchDisplay from './PitchDisplay.vue'

const { t } = useI18n()

const { toneMode, setToneMode } = useTonePlayer()
const selectedToneMode = ref<ToneMode>(toneMode.value)

watch(selectedToneMode, (mode) => {
  setToneMode(mode)
})

type VoiceRange = {
  label: string
  midiMin: number
  midiMax: number
}

const VOICE_RANGES: VoiceRange[] = [
  { label: 'Full (C2–C7)', midiMin: 36, midiMax: 96 },
  { label: 'Soprano (C4–C6)', midiMin: 60, midiMax: 84 },
  { label: 'Soprano+ (C4–C7)', midiMin: 60, midiMax: 96 },
  { label: 'Mezzo-Soprano (A3–A5)', midiMin: 57, midiMax: 81 },
  { label: 'Alto (F3–F5)', midiMin: 53, midiMax: 77 },
  { label: 'Tenor (B2–B4)', midiMin: 47, midiMax: 71 },
  { label: 'Baritone (G2–G4)', midiMin: 43, midiMax: 67 },
  { label: 'Bass (E2–E4)', midiMin: 40, midiMax: 64 },
]

const selectedRangeIndex = ref(4)
const selectedRange = computed(() => VOICE_RANGES[selectedRangeIndex.value])

const selectedNote = ref<NoteName>('B')
const selectedOctave = ref(3)
const selectedCents = ref(20)
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

const pitchDisplayRef = ref<InstanceType<typeof PitchDisplay> | null>(null)

function toggle() {
  pitchDisplayRef.value?.stopSequence()
  if (isListening.value) stop()
  else start()
}

onUnmounted(() => {
  pitchDisplayRef.value?.stopSequence()
  stop()
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <div class="flex w-full flex-wrap items-center gap-4">
      <div class="flex items-center gap-2">
        <label class="hidden text-sm text-gray-400 lg:block">
          {{ t('sounds.toneSound') }}
        </label>
        <ToneModeSelect v-model="selectedToneMode" class="min-w-30 flex-1" />
      </div>

      <Select v-model.number="selectedRangeIndex" class="flex-1">
        <option
          v-for="(range, index) in VOICE_RANGES"
          :key="index"
          :value="index"
        >
          {{ range.label }}
        </option>
      </Select>

      <Button
        class="ml-auto min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </Button>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-400">{{ error }}</p>

    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-gray-800/50 p-4"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Note</label>
        <Select v-model="selectedNote" class="min-w-20">
          <option v-for="note in NOTE_NAMES" :key="note" :value="note">
            {{ note }}
          </option>
        </Select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Octave</label>
        <Select v-model.number="selectedOctave" class="min-w-16">
          <option v-for="oct in [2, 3, 4, 5, 6]" :key="oct" :value="oct">
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

    <PitchDisplay
      ref="pitchDisplayRef"
      :noteInfo="noteInfo"
      :frequency="frequency"
      :clarity="clarity"
      :isClean="isClean"
      :isListening="isListening"
      :midiMin="selectedRange.midiMin"
      :midiMax="selectedRange.midiMax"
    />
  </div>
</template>

<style scoped></style>

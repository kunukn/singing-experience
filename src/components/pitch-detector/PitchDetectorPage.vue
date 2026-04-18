<script setup lang="ts">
import type { ToneMode } from '@/composables/useTonePlayer'
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
  { label: 'Full (C2–C6)', midiMin: 36, midiMax: 84 },
  { label: 'Soprano (C4–C6)', midiMin: 60, midiMax: 84 },
  { label: 'Mezzo-Soprano (A3–A5)', midiMin: 57, midiMax: 81 },
  { label: 'Alto (F3–F5)', midiMin: 53, midiMax: 77 },
  { label: 'Tenor (B2–B4)', midiMin: 47, midiMax: 71 },
  { label: 'Baritone (G2–G4)', midiMin: 43, midiMax: 67 },
  { label: 'Bass (E2–E4)', midiMin: 40, midiMax: 64 },
]

const selectedRangeIndex = ref(4)
const selectedRange = computed(() => VOICE_RANGES[selectedRangeIndex.value])

const {
  frequency,
  noteInfo,
  clarity,
  isListening,
  isClean,
  error,
  start,
  stop,
} = usePitchDetection()

const pitchDisplayRef = ref<InstanceType<typeof PitchDisplay> | null>(null)

function toggle() {
  pitchDisplayRef.value?.stopSequence()
  if (isListening.value) stop()
  else start()
}

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <div class="flex w-full flex-wrap items-center gap-4">
      <BasicSelect v-model.number="selectedRangeIndex" class="flex-1">
        <option
          v-for="(range, index) in VOICE_RANGES"
          :key="index"
          :value="index"
        >
          {{ range.label }}
        </option>
      </BasicSelect>

      <div class="flex items-center gap-2">
        <label v-if="false" class="hidden text-sm text-gray-400 lg:block">
          {{ t('sounds.toneSound') }}
        </label>
        <ToneModeSelect v-model="selectedToneMode" class="min-w-30 flex-1" />
      </div>

      <BasicButton
        class="ml-auto min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </BasicButton>
    </div>

    <p v-if="error" class="mb-4 text-sm text-red-400">{{ error }}</p>

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

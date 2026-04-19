<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { useLocalStorage } from '@vueuse/core'
import PitchDisplay from './PitchDisplay.vue'

const { t } = useI18n()

const VALID_TONE_MODES: ToneMode[] = ['piano', 'bell', 'bass', 'square']

const { toneMode, setToneMode } = useTonePlayer()
const selectedToneMode = useLocalStorage<ToneMode>(
  'singing.pitchToneMode',
  toneMode.value,
)
if (!VALID_TONE_MODES.includes(selectedToneMode.value)) {
  selectedToneMode.value = toneMode.value
}

watch(selectedToneMode, (mode) => {
  setToneMode(mode)
})

type VoiceRange = {
  labelKey: string
  noteRange: string
  midiMin: number
  midiMax: number
}

const VOICE_RANGES: VoiceRange[] = [
  {
    labelKey: 'voiceRanges.full',
    noteRange: 'C2–C7',
    midiMin: 36,
    midiMax: 96,
  },
  {
    labelKey: 'voiceRanges.sopranoPlus',
    noteRange: 'C4–G6',
    midiMin: 60,
    midiMax: 91,
  },
  {
    labelKey: 'voiceRanges.soprano',
    noteRange: 'C4–C6',
    midiMin: 60,
    midiMax: 84,
  },
  {
    labelKey: 'voiceRanges.mezzoSoprano',
    noteRange: 'A3–A5',
    midiMin: 57,
    midiMax: 81,
  },
  {
    labelKey: 'voiceRanges.alto',
    noteRange: 'F3–F5',
    midiMin: 53,
    midiMax: 77,
  },
  {
    labelKey: 'voiceRanges.tenor',
    noteRange: 'C3–C5',
    midiMin: 48,
    midiMax: 72,
  },
  {
    labelKey: 'voiceRanges.baritone',
    noteRange: 'A2–A4',
    midiMin: 45,
    midiMax: 69,
  },
  {
    labelKey: 'voiceRanges.bass',
    noteRange: 'E2–E4',
    midiMin: 40,
    midiMax: 64,
  },
]

const DEFAULT_RANGE_INDEX = 4
const selectedRangeIndex = useLocalStorage(
  'singing.rangeIndex',
  DEFAULT_RANGE_INDEX,
)
if (
  typeof selectedRangeIndex.value !== 'number' ||
  !Number.isInteger(selectedRangeIndex.value) ||
  selectedRangeIndex.value < 0 ||
  selectedRangeIndex.value >= VOICE_RANGES.length
) {
  selectedRangeIndex.value = DEFAULT_RANGE_INDEX
}
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
    <div class="flex w-full flex-wrap items-center gap-2 sm:gap-4">
      <Select v-model.number="selectedRangeIndex" class="flex-1">
        <option
          v-for="(range, index) in VOICE_RANGES"
          :key="index"
          :value="index"
        >
          {{ t(range.labelKey) }} ({{ range.noteRange }})
        </option>
      </Select>

      <div class="flex items-center gap-2">
        <label v-if="false" class="hidden text-sm text-gray-400 lg:block">
          {{ t('sounds.toneSound') }}
        </label>
        <ToneModeSelect v-model="selectedToneMode" class="min-w-30 flex-1" />
      </div>

      <Button
        class="ms-auto min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </Button>
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

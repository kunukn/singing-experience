<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { C3_MIDI } from '@/utils/noteUtils'
import GraceKellyDisplay from './GraceKellyDisplay.vue'
import { useGraceKelly } from './useGraceKelly'

const DEFAULT_VOZ_INDEX = 5 // Voz 6
const VOZ_COUNT = 6
/* E2 = MIDI 40, A3 = MIDI 57 */
const START_TONE_MIDI_MIN = 40
const START_TONE_MIDI_MAX = 57
const DEFAULT_START_TONE_MIDI = C3_MIDI // 48

const vozIndex = useLocalStorage('syng.graceKellyVozIndex', DEFAULT_VOZ_INDEX)
if (
  typeof vozIndex.value !== 'number' ||
  !Number.isInteger(vozIndex.value) ||
  vozIndex.value < 0 ||
  vozIndex.value >= VOZ_COUNT
) {
  vozIndex.value = DEFAULT_VOZ_INDEX
}

const startToneMidi = useLocalStorage(
  'syng.graceKellyStartToneMidi',
  DEFAULT_START_TONE_MIDI,
)
if (
  startToneMidi.value < START_TONE_MIDI_MIN ||
  startToneMidi.value > START_TONE_MIDI_MAX
) {
  startToneMidi.value = DEFAULT_START_TONE_MIDI
}

const ALLOWED_BPMS = [60, 90, 120]
const DEFAULT_BPM = 120
const bpm = useLocalStorage('syng.graceKellyBpm', DEFAULT_BPM)
if (!ALLOWED_BPMS.includes(bpm.value)) {
  bpm.value = DEFAULT_BPM
}

const game = useGraceKelly()
</script>

<template>
  <GraceKellyDisplay
    :game="game"
    v-model:vozIndex="vozIndex"
    v-model:startToneMidi="startToneMidi"
    v-model:bpm="bpm"
  />
</template>

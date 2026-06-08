<script setup lang="ts">
import { C3_MIDI } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import GraceKellyDisplay from './GraceKellyDisplay.vue'
import {
  ALLOWED_BPMS,
  DEFAULT_BPM,
  START_TONE_MIDI_MAX,
  START_TONE_MIDI_MIN,
} from './graceKellyConstants'
import { VOZ_MELODIES } from './graceKellyMelodies'
import { useGraceKelly } from './useGraceKelly'

const DEFAULT_VOZ_INDEX = VOZ_MELODIES.length - 1
const VOZ_COUNT = VOZ_MELODIES.length
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

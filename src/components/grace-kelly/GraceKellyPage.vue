<script setup lang="ts">
import { G2_MIDI } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import GraceKellyDisplay from './GraceKellyDisplay.vue'
import GraceKellyHarmonyDisplay from './GraceKellyHarmonyDisplay.vue'
import {
  ALLOWED_BPMS,
  DEFAULT_BPM,
  START_TONE_MIDI_MAX,
  START_TONE_MIDI_MIN,
} from './graceKellyConstants'
import { VOZ_MELODIES } from './graceKellyMelodies'
import { useGraceKelly } from './useGraceKelly'
import { useGraceKellyHarmony } from './useGraceKellyHarmony'

const { t } = useI18n()

const DEFAULT_VOZ_INDEX = VOZ_MELODIES.length - 1
const VOZ_COUNT = VOZ_MELODIES.length
const DEFAULT_START_TONE_MIDI = G2_MIDI // 43
/* All parts by VOZ_MELODIES index — the harmony tab starts with every voice on. */
const ALL_VOZ_INDICES = VOZ_MELODIES.map((_, index) => index)

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

/* Which voices the harmony tab plays/shows. Reset to all six if persisted data
 * is malformed (not an array of unique in-range integers). */
const selectedVozIndices = useLocalStorage<number[]>(
  'syng.graceKellyHarmonyVoices',
  ALL_VOZ_INDICES,
)
const isValidVozSelection =
  Array.isArray(selectedVozIndices.value) &&
  selectedVozIndices.value.every(
    (value) => Number.isInteger(value) && value >= 0 && value < VOZ_COUNT,
  ) &&
  new Set(selectedVozIndices.value).size === selectedVozIndices.value.length
if (!isValidVozSelection) {
  selectedVozIndices.value = [...ALL_VOZ_INDICES]
}

const activeTab = useLocalStorage('syng.graceKellyTab', 'sing')

const game = useGraceKelly()
const harmonyGame = useGraceKellyHarmony()

/* One shared audio engine drives both tabs — stop any in-flight playback when
 * switching so the inactive tab can't keep scheduling notes underneath. */
watch(activeTab, () => {
  game.stop()
  harmonyGame.stop()
})
</script>

<template>
  <PrimeTabs v-model:value="activeTab">
    <PrimeTabList>
      <PrimeTab value="sing">{{ t('graceKelly.tabs.singAlong') }}</PrimeTab>
      <PrimeTab value="harmony">{{ t('graceKelly.tabs.harmony') }}</PrimeTab>
    </PrimeTabList>
    <PrimeTabPanels class="px-0">
      <PrimeTabPanel value="sing">
        <GraceKellyDisplay
          :game="game"
          v-model:vozIndex="vozIndex"
          v-model:startToneMidi="startToneMidi"
          v-model:bpm="bpm"
        />
      </PrimeTabPanel>
      <PrimeTabPanel value="harmony">
        <GraceKellyHarmonyDisplay
          :game="harmonyGame"
          v-model:startToneMidi="startToneMidi"
          v-model:bpm="bpm"
          v-model:selectedVozIndices="selectedVozIndices"
        />
      </PrimeTabPanel>
    </PrimeTabPanels>
  </PrimeTabs>
</template>

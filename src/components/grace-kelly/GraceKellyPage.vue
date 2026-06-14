<script setup lang="ts">
import { G2_MIDI } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import GraceKellyDisplay from './GraceKellyDisplay.vue'
import GraceKellyHarmonyDisplay from './GraceKellyHarmonyDisplay.vue'
import GraceKellySingDisplay from './GraceKellySingDisplay.vue'
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

/* "Sing live" metronome — a click track + count-in to guide the beat. Default
 * on since it's a singing aid; toggled from the Sing live controls. */
const isMetronomeEnabled = useLocalStorage('syng.graceKellyMetronome', true)

/* Active-bar highlight — the green box over the current measure. Shared by the
 * "Sing along" and "Sing live" tabs (one toggle, one setting). Default on; purely
 * visual, so (unlike the metronome) it is not handed to the game composables. */
const isBarHighlightEnabled = useLocalStorage(
  'syng.graceKellyBarHighlight',
  true,
)

/* Note-name labels above every note on the sheet. Shared by the "Sing along" and
 * "Sing live" tabs (both render GraceKellySingSheet). Default off; purely visual. */
const areToneLabelsShown = useLocalStorage('syng.graceKellyToneLabels', false)

const game = useGraceKelly()
const harmonyGame = useGraceKellyHarmony()
/* Silent timeline for the "Sing live" tab — advances the sheet on the BPM clock
 * with no playback; the singer's mic supplies the sound (plus the metronome). */
const singGame = useGraceKelly({
  silent: true,
  metronomeEnabled: isMetronomeEnabled,
})
/* Audible instance for the "Sing live" tab's ♪/Mute preview — plays the melody
 * out loud so the singer can hear it before singing. Shares the metronome ref so
 * the click track + count-in play under the preview too when the Beat toggle is on. */
const singPreviewGame = useGraceKelly({
  metronomeEnabled: isMetronomeEnabled,
})

/* One shared audio engine drives every tab — stop any in-flight playback when
 * switching so the inactive tab can't keep scheduling notes underneath. */
watch(activeTab, () => {
  game.stop()
  harmonyGame.stop()
  singGame.stop()
  singPreviewGame.stop()
})
</script>

<template>
  <div class="mx-auto w-full max-w-400">
    <PrimeTabs v-model:value="activeTab">
      <PrimeTabList>
        <PrimeTab value="sing">{{ t('graceKelly.tabs.singAlong') }}</PrimeTab>
        <PrimeTab value="harmony">{{ t('graceKelly.tabs.harmony') }}</PrimeTab>
        <PrimeTab value="sing-live">{{ t('graceKelly.tabs.sing') }}</PrimeTab>
      </PrimeTabList>
      <PrimeTabPanels class="px-0">
        <PrimeTabPanel value="sing">
          <GraceKellyDisplay
            :game="game"
            :isActive="activeTab === 'sing'"
            v-model:vozIndex="vozIndex"
            v-model:startToneMidi="startToneMidi"
            v-model:bpm="bpm"
            v-model:isBarHighlightEnabled="isBarHighlightEnabled"
            v-model:areToneLabelsShown="areToneLabelsShown"
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
        <PrimeTabPanel value="sing-live">
          <GraceKellySingDisplay
            :game="singGame"
            :previewGame="singPreviewGame"
            v-model:vozIndex="vozIndex"
            v-model:startToneMidi="startToneMidi"
            v-model:bpm="bpm"
            v-model:isMetronomeEnabled="isMetronomeEnabled"
            v-model:isBarHighlightEnabled="isBarHighlightEnabled"
            v-model:areToneLabelsShown="areToneLabelsShown"
          />
        </PrimeTabPanel>
      </PrimeTabPanels>
    </PrimeTabs>
  </div>
</template>

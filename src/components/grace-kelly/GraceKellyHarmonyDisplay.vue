<script setup lang="ts">
import GraceKellySettingsRow from './GraceKellySettingsRow.vue'
import { VOZ_LABEL_KEYS } from './graceKellyConstants'
import { GRACE_KELLY_SYLLABLES } from './graceKellyLyrics'
import type { GraceKellyHarmonyResult } from './useGraceKellyHarmony'

type Props = {
  game: GraceKellyHarmonyResult
}

const props = defineProps<Props>()

const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
/* Voices to play and show, by VOZ_MELODIES index, kept sorted ascending. */
const selectedVozIndices = defineModel<number[]>('selectedVozIndices', {
  required: true,
})

const { t } = useI18n()

const {
  isPlaying,
  isPaused,
  isDone,
  activeNoteIndex,
  start,
  pause,
  resume,
  stop,
} = props.game

/* True while a sequence is playing or paused — the settings and part toggles
 * stay locked so the running timeline can't be changed underneath it. */
const isRunning = computed(() => isPlaying.value || isPaused.value)

/* Flat reading-order index of the syllable currently being sung — the last
 * syllable whose starting tone has been reached. -1 when idle. */
const activeSyllableIndex = computed(() => {
  if (activeNoteIndex.value === null) return -1

  let active = -1
  for (let index = 0; index < GRACE_KELLY_SYLLABLES.length; index++) {
    if (GRACE_KELLY_SYLLABLES[index].noteIndex <= activeNoteIndex.value) {
      active = index
    } else {
      break
    }
  }

  return active
})

/* All six part labels, indexed by VOZ_MELODIES index — GraceKellyAllSheets reads
 * vozLabels[vozIndex], so this must stay in true index order (not reversed). */
const allVozLabels = computed(() =>
  VOZ_LABEL_KEYS.map((key) => t(`graceKelly.vozLabels.${key}`)),
)

/* Toggles displayed low → high (reversed order) while keeping the real
 * VOZ_MELODIES index, so each toggle drives the voice its label names. */
const partToggles = computed(() =>
  VOZ_LABEL_KEYS.map((key, index) => ({
    index,
    label: t(`graceKelly.vozLabels.${key}`),
  })).reverse(),
)

function isVozSelected(index: number) {
  return selectedVozIndices.value.includes(index)
}

function toggleVoz(index: number, enabled: boolean) {
  const next = enabled
    ? [...selectedVozIndices.value, index]
    : selectedVozIndices.value.filter((value) => value !== index)

  selectedVozIndices.value = [...new Set(next)].sort((a, b) => a - b)
}
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="grace-kelly-harmony-display"
  >
    <GraceKellySettingsRow
      v-model:startToneMidi="startToneMidi"
      v-model:bpm="bpm"
      :isRunning="isRunning"
      :showVoz="false"
    />

    <div
      class="flex max-w-full flex-wrap items-center justify-center gap-x-4 gap-y-2"
    >
      <label
        v-for="part in partToggles"
        :key="part.index"
        class="flex items-center gap-2 text-sm"
      >
        <PrimeToggleSwitch
          :modelValue="isVozSelected(part.index)"
          :disabled="isRunning"
          @update:modelValue="(value: boolean) => toggleVoz(part.index, value)"
        />
        {{ part.label }}
      </label>
    </div>

    <div class="flex min-w-50 items-baseline gap-2">
      <PrimeButton
        v-if="isRunning"
        severity="danger"
        size="small"
        rounded
        class="min-w-24"
        @click="stop"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <PrimeButton
        v-if="isPlaying"
        class="min-w-24"
        severity="warn"
        size="small"
        rounded
        @click="pause"
      >
        {{ t('generic.pause') }}
      </PrimeButton>
      <PrimeButton
        v-if="isPaused"
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        @click="resume"
      >
        {{ t('generic.resume') }}
      </PrimeButton>
      <PrimeButton
        v-if="!isRunning"
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        :disabled="selectedVozIndices.length === 0"
        @click="start(startToneMidi, selectedVozIndices, bpm)"
      >
        {{ t('generic.start') }}
      </PrimeButton>
    </div>

    <div class="flex min-h-[2rem] flex-col justify-center">
      <p class="text-sm leading-none text-(--p-text-muted-color)">
        {{ t('graceKelly.harmony.subtitle') }}
      </p>
    </div>

    <GraceKellyAllSheets
      v-if="selectedVozIndices.length > 0"
      :activeNoteIndex="activeNoteIndex"
      :isDone="isDone"
      :activeSyllableIndex="activeSyllableIndex"
      :startToneMidi="startToneMidi"
      :vozLabels="allVozLabels"
      :vozIndices="selectedVozIndices"
    />
  </div>
</template>

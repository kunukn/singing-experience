<script setup lang="ts">
import GraceKellyPartLadder from './GraceKellyPartLadder.vue'
import GraceKellySettingsRow from './GraceKellySettingsRow.vue'
import { useMediaQuery } from '@vueuse/core'
import { voiceTypeColor } from '@/utils/pitchColors'
import { VOZ_LABEL_KEYS } from './graceKellyConstants'
import { GRACE_KELLY_SYLLABLES } from './graceKellyLyrics'
import { vozColorIndex } from './graceKellyRoll'
import type { GraceKellyHarmonyResult } from './useGraceKellyHarmony'

type Props = {
  game: GraceKellyHarmonyResult
  /* How the parts are shown: one music sheet per part, or all parts as
   * coloured blocks on one pitch chart. Everything else is the same. */
  view?: 'sheets' | 'chart'
}

const props = withDefaults(defineProps<Props>(), { view: 'sheets' })

const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
/* Voices to play and show, by VOZ_MELODIES index, kept sorted ascending. */
const selectedVozIndices = defineModel<number[]>('selectedVozIndices', {
  required: true,
})
const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const { t } = useI18n()
const { isDark } = useDarkMode()

const isChartView = computed(() => props.view === 'chart')

/* Tailwind's md breakpoint. From here up the chart view has room for the part
 * ladder beside the chart; below it the ladder becomes a row above. */
const isWideViewport = useMediaQuery('(min-width: 48rem)')

/* Chart view only: one colour per part, shared by the chart blocks and the
 * ladder dots that act as its legend. */
const vozColors = computed(() =>
  VOZ_LABEL_KEYS.map((_, index) =>
    voiceTypeColor(vozColorIndex(index), isDark.value),
  ),
)

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

/* Mirrors Sing live: once the song ends the Start button reads "Play again",
 * until a setting change makes the next run a fresh start. */
const hasFinished = ref(false)
watch(isDone, (done) => {
  hasFinished.value = done
})
watch(
  [selectedVozIndices, startToneMidi, bpm],
  () => {
    hasFinished.value = false
  },
  { deep: true },
)

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
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    :data-testid="
      isChartView
        ? 'grace-kelly-harmony-chart-display'
        : 'grace-kelly-harmony-display'
    "
  >
    <GraceKellySettingsRow
      v-model:startToneMidi="startToneMidi"
      v-model:bpm="bpm"
      v-model:areToneLabelsShown="areToneLabelsShown"
      :isRunning="isRunning"
      :showVoz="false"
      :showToneLabelToggle="!isChartView"
    />

    <div class="flex flex-col justify-center">
      <p class="text-sm leading-none text-(--p-text-muted-color)">
        {{ t('graceKelly.harmony.subtitle') }}
      </p>
    </div>

    <!-- The two wrappers only lay out the chart view (ladder beside the chart).
         In the sheets view they are display: contents, so its single centred
         column is unchanged. -->
    <div
      :class="
        isChartView
          ? 'flex w-full flex-col items-center gap-4 md:flex-row md:items-start'
          : 'contents'
      "
    >
      <div :class="isChartView ? 'w-full md:w-44 md:shrink-0' : 'contents'">
        <GraceKellyPartLadder
          v-model:selectedVozIndices="selectedVozIndices"
          :isRunning="isRunning"
          :layout="
            !isChartView ? 'auto' : isWideViewport ? 'vertical' : 'horizontal'
          "
          :colors="isChartView ? vozColors : undefined"
        />
      </div>

      <div
        :class="
          isChartView
            ? 'flex w-full min-w-0 flex-1 flex-col items-center gap-4'
            : 'contents'
        "
      >
        <div class="flex min-w-50 items-center gap-2">
          <PrimeButton
            v-if="isRunning"
            severity="danger"
            size="small"
            rounded
            class="min-w-20"
            @click="stop"
          >
            {{ t('generic.stop') }}
          </PrimeButton>

          <PrimeButton
            v-if="isPlaying"
            class="min-w-20"
            severity="warn"
            size="small"
            rounded
            @click="pause"
          >
            {{ t('generic.pause') }}
          </PrimeButton>
          <PrimeButton
            v-if="isPaused"
            class="min-w-20"
            severity="success"
            size="small"
            rounded
            @click="resume"
          >
            {{ t('generic.resume') }}
          </PrimeButton>
          <PrimeButton
            v-if="!isRunning"
            class="min-w-20"
            severity="success"
            size="small"
            rounded
            :disabled="selectedVozIndices.length === 0"
            @click="start(startToneMidi, selectedVozIndices, bpm)"
          >
            {{ hasFinished ? t('generic.playAgain') : t('generic.start') }}
          </PrimeButton>
        </div>

        <GraceKellyRollChart
          v-if="isChartView"
          :activeNoteIndex="activeNoteIndex"
          :activeSyllableIndex="activeSyllableIndex"
          :startToneMidi="startToneMidi"
          :vozIndices="selectedVozIndices"
        />
        <GraceKellyAllSheets
          v-else-if="selectedVozIndices.length > 0"
          :activeNoteIndex="activeNoteIndex"
          :isDone="isDone"
          :activeSyllableIndex="activeSyllableIndex"
          :startToneMidi="startToneMidi"
          :vozLabels="allVozLabels"
          :vozIndices="selectedVozIndices"
          :showToneLabels="areToneLabelsShown"
        />
      </div>
    </div>
  </div>
</template>

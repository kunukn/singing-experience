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
  /* True only while this display's tab is showing. PrimeTabs keeps every panel
   * mounted, so the idle preview mic is gated on this. */
  isActive: boolean
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

/* Tailwind's md breakpoint: the one width at which both views switch the part
 * toggles between a scrollable row (below) and a stacked list (from here up). */
const isWideViewport = useMediaQuery('(min-width: 48rem)')

/* How the part toggles are laid out. Below md: one scrollable row, leaving
 * the height to the sheets or the chart. From md up: stacked beside them. */
const ladderLayout = computed(() =>
  isWideViewport.value ? 'vertical' : 'horizontal',
)

/* One colour per part, by VOZ_MELODIES index. The dot on a part's toggle, the
 * dot by its sheet title and its blocks on the chart all share it. */
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

const { isPreviewEnabled } = useSettings()

/* "See my voice" only has somewhere to draw on the chart, so the sheets view
 * never counts as enabled: it neither asks for the mic nor listens when the
 * shared setting is switched on from another tab. Writable, because
 * useIdlePreview switches the setting back off when the mic is denied. */
const isChartPreviewEnabled = computed({
  get: () => isPreviewEnabled.value && isChartView.value,
  set: (enabled) => {
    isPreviewEnabled.value = enabled
  },
})

/* Listens only while the chart tab is showing and nothing plays, so it never
 * competes with playback or with another tab's mic. */
const { previewMidi, previewFrequency, micPermission } = useIdlePreview({
  isGameActive: computed(
    () => isRunning.value || !props.isActive || !isChartView.value,
  ),
  isEnabled: isChartPreviewEnabled,
})

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
      :showToneLabelToggle="true"
    />

    <!-- From md up the part toggles sit beside the sheets or the chart, level
         with its top, and stick while the page scrolls (the sheet stack can be
         taller than the window). Their top margin is the subtitle and the
         Start button row beside them: the subtitle line (0.875rem,
         leading-none) and one control height, each followed by a 1rem gap. -->
    <div
      class="flex w-full flex-col items-center gap-4 md:flex-row md:items-start"
    >
      <div
        class="w-full md:sticky md:top-4 md:mt-[calc(var(--app-control-height)+2.875rem)] md:w-44 md:shrink-0"
      >
        <GraceKellyPartLadder
          v-model:selectedVozIndices="selectedVozIndices"
          :isRunning="isRunning"
          :layout="ladderLayout"
          :colors="vozColors"
        />
      </div>

      <div class="flex w-full min-w-0 flex-1 flex-col items-center gap-4">
        <p class="text-sm leading-none text-(--p-text-muted-color)">
          {{ t('graceKelly.harmony.subtitle') }}
        </p>

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

          <PreviewToggle
            v-model="isPreviewEnabled"
            :disabled="!isChartView || micPermission === 'denied' || isRunning"
          />
        </div>

        <GraceKellyRollChart
          v-if="isChartView"
          :activeNoteIndex="activeNoteIndex"
          :activeSyllableIndex="activeSyllableIndex"
          :startToneMidi="startToneMidi"
          :vozIndices="selectedVozIndices"
          :showToneLabels="areToneLabelsShown"
          :previewMidi="previewMidi"
          :previewFrequency="previewFrequency"
        />
        <GraceKellyAllSheets
          v-else-if="selectedVozIndices.length > 0"
          :activeNoteIndex="activeNoteIndex"
          :isDone="isDone"
          :activeSyllableIndex="activeSyllableIndex"
          :startToneMidi="startToneMidi"
          :vozLabels="allVozLabels"
          :vozIndices="selectedVozIndices"
          :vozColors="vozColors"
          :showToneLabels="areToneLabelsShown"
        />
      </div>
    </div>
  </div>
</template>

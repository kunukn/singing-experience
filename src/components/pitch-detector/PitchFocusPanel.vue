<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'
import PitchFocusStats from './PitchFocusStats.vue'
import PitchHistoryChart from './PitchHistoryChart.vue'
import type { PitchLaneDetection, PitchPreviewLane } from './pitchLanes'
import { useFocusTone } from './useFocusTone'

type Props = {
  laneDetection?: PitchLaneDetection
  previewLanes: PitchPreviewLane[]
  isListening: boolean
  /* Where the chart sits before the singer has picked a tone */
  defaultMidi: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  tonePlayed: []
}>()

const { t, locale } = useI18n()
const { isDark } = useDarkMode()

const { focusMidi, isLocked, centsFromFocus, stats } = useFocusTone({
  detection: () => props.laneDetection,
  isListening: () => props.isListening,
})

/* One semitone either side of the tone — wide enough to see a neighbour
 * coming, narrow enough that a few cents of drift is plain to see */
const centerMidi = computed(() => focusMidi.value ?? props.defaultMidi)
const midiMin = computed(() => centerMidi.value - 1)
const midiMax = computed(() => centerMidi.value + 1)

const focusLabel = computed(() =>
  focusMidi.value === null ? null : midiToNoteLabel(focusMidi.value).label,
)

const centsFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      signDisplay: 'exceptZero',
      maximumFractionDigits: 0,
    }),
)

const centsLabel = computed(() =>
  centsFromFocus.value === null
    ? null
    : `${centsFormat.value.format(centsFromFocus.value)}¢`,
)

const centsColor = computed(() =>
  centsFromFocus.value === null
    ? undefined
    : cleanTextColor(centsFromFocus.value, isDark.value),
)
</script>

<template>
  <div
    class="flex w-full flex-1 flex-col items-center gap-3"
    data-testid="pitch-focus-panel"
    :data-focus-midi="focusMidi ?? ''"
  >
    <div class="flex w-full max-w-4xl flex-wrap items-center gap-x-6 gap-y-2">
      <div class="flex items-baseline gap-3">
        <span
          v-if="focusLabel"
          class="text-4xl font-bold tabular-nums"
          data-testid="focus-note"
        >
          {{ focusLabel }}
        </span>
        <span v-else class="text-(--p-text-muted-color)">
          {{ t('pitchDetector.focus.hint') }}
        </span>
        <span
          v-if="focusLabel && centsLabel"
          class="min-w-14 text-xl tabular-nums"
          dir="ltr"
          :style="{ color: centsColor }"
          data-testid="focus-cents"
        >
          {{ centsLabel }}
        </span>
      </div>

      <ToggleIconButton
        v-model="isLocked"
        iconOn="pi pi-lock"
        iconOff="pi pi-lock-open"
        :label="t('pitchDetector.focus.lock')"
        :disabled="focusMidi === null"
        data-testid="focus-lock"
      />

      <PitchFocusStats :stats="stats" class="ms-auto" />
    </div>

    <PitchHistoryChart
      :laneDetections="laneDetection ? [laneDetection] : []"
      :previewLanes="previewLanes"
      :isListening="isListening"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :highlightedMidi="focusMidi"
      :focusMidi="focusMidi"
      :isVoiceRibbonAllowed="false"
      @tonePlayed="emit('tonePlayed')"
    />
  </div>
</template>

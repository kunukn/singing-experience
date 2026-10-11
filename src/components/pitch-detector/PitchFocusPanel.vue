<script setup lang="ts">
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'
import PitchFocusLevel from './PitchFocusLevel.vue'
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
  /* The selected voice range — bounds the notes the singer can pick */
  rangeMidiMin: number
  rangeMidiMax: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  tonePlayed: []
}>()

const { t, locale } = useI18n()
const { isDark } = useDarkMode()

const { playTone } = useTonePlayer()

const { focusMidi, isLocked, centsFromFocus, stats, lockTo, clearStats } =
  useFocusTone({
    detection: () => props.laneDetection,
    isListening: () => props.isListening,
  })

const chartRef = ref<InstanceType<typeof PitchHistoryChart> | null>(null)

/* Whether a stopped take left a trail to clear. Checked on stop rather than
 * live: the samples sit in the canvas's own buffers, not in reactive state. */
const hasSamples = ref(false)

watch(
  () => props.isListening,
  (listening) => {
    if (listening) {
      hasSamples.value = false

      return
    }

    nextTick(() => {
      hasSamples.value = (chartRef.value?.getSamples().low.length ?? 0) > 0
    })
  },
)

/* Wipes the trail and the stats that describe it; the focus tone and lock
 * stay, so the singer can go again on the same note */
function clearTake() {
  chartRef.value?.clearSamples()
  clearStats()
  hasSamples.value = false
}

/* One semitone either side of the tone — wide enough to see a neighbour
 * coming, narrow enough that a few cents of drift is plain to see */
const centerMidi = computed(() => focusMidi.value ?? props.defaultMidi)
const midiMin = computed(() => centerMidi.value - 1)
const midiMax = computed(() => centerMidi.value + 1)

/* A string sentinel, not null: PrimeSelect treats a null model as "nothing
 * selected" and would show its placeholder instead of the Auto label */
const AUTO_TARGET = 'auto'
type TargetValue = number | typeof AUTO_TARGET

/* High to low, with the catch-all Auto last — see "Vertical Ordering" in
 * AGENTS.md. A focus outside the range is slotted in by pitch so the select
 * can always show what is locked. */
const targetOptions = computed(() => {
  const highest = Math.max(props.rangeMidiMax, focusMidi.value ?? -Infinity)
  const lowest = Math.min(props.rangeMidiMin, focusMidi.value ?? Infinity)
  const options: { label: string; value: TargetValue }[] = []
  for (let midi = highest; midi >= lowest; midi--) {
    const isInRange = midi >= props.rangeMidiMin && midi <= props.rangeMidiMax
    if (!isInRange && midi !== focusMidi.value) continue

    options.push({ label: midiToNoteLabel(midi).label, value: midi })
  }
  options.push({ label: t('pitchDetector.focus.auto'), value: AUTO_TARGET })

  return options
})

/* One state behind both controls: the picked note is simply the locked one */
const targetMidi = computed<TargetValue>({
  get: () =>
    isLocked.value && focusMidi.value !== null ? focusMidi.value : AUTO_TARGET,
  set: (value) => {
    if (value === AUTO_TARGET) {
      isLocked.value = false

      return
    }

    lockTo(value)
    playTone(midiToFrequency(value))
    /* Lets the parent start the preview's deaf window, so the mic does not
     * hear the reference tone as the singer */
    emit('tonePlayed')
  },
})

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
      <div class="flex items-center gap-3">
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
        <!-- Kept in the layout through silence (invisible, not removed) and
             wide enough for "−120¢", so the lock button beside it holds still
             as the singer starts and stops -->
        <span
          v-if="focusLabel"
          class="min-w-18 text-xl tabular-nums"
          :class="{ invisible: !centsLabel }"
          dir="ltr"
          :style="{ color: centsColor }"
          data-testid="focus-cents"
        >
          {{ centsLabel ?? '+0¢' }}
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

      <PrimeSelect
        v-model="targetMidi"
        :options="targetOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :aria-label="t('pitchDetector.focus.targetNote')"
        data-testid="focus-target-select"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('pitchDetector.focus.targetNote') }}
          </div>
        </template>
      </PrimeSelect>

      <!-- Hidden rather than removed while there is nothing to clear, so the
           stats beside it don't shift as a take starts and stops -->
      <PrimeButton
        :class="{ invisible: isListening || !hasSamples }"
        severity="secondary"
        text
        rounded
        size="small"
        icon="pi pi-trash"
        :label="t('generic.clear')"
        data-testid="focus-clear"
        @click="clearTake"
      />

      <PitchFocusStats :stats="stats" class="ms-auto" />
    </div>

    <PitchFocusLevel :stats="stats" class="w-full max-w-4xl" />

    <PitchHistoryChart
      ref="chartRef"
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

<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { CLOSE_CENTS } from '@/utils/pitchColors'
import { useLiveCents } from './useLiveCents'
import {
  isCleanEnough,
  type RangeFinderMode,
  type RangeFinderStep,
} from './useRangeFinder'
import { formatNote } from './voiceRangeNotes'

/* The running search, as useRangeFinder reports it. Mounted only while the
 * step is low or high, so a new search always starts with a fresh flash. */
type Props = {
  step: RangeFinderStep
  mode: RangeFinderMode
  /* The clean live pitch, fractional; null when silent */
  sungMidi: number | null
  candidateMidi: number | null
  /* The hold bar, 0–1 */
  progress: number
  isFilling: boolean
  lowestMidi: number | null
  highestMidi: number | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  cancel: []
  done: []
}>()

const { t } = useI18n()

/* The note being sung right now, or none. Not the hold's candidate: that stays
 * set through silence, and a frozen note would read as still being heard. */
const liveMidi = computed(() =>
  props.sungMidi === null ? null : Math.round(props.sungMidi),
)

/* How far the live note sits from its semitone, in the tuner's colours */
const { liveCents, liveCentsText, liveCentsColor } = useLiveCents(
  () => props.sungMidi,
)

/* The high step only counts clean notes, so say which kind this one is */
const isLiveClean = computed(
  () => props.sungMidi !== null && isCleanEnough(props.sungMidi),
)

const stepRecord = computed(() =>
  props.step === 'low' ? props.lowestMidi : props.highestMidi,
)

/* How long a new record shows as a full bar with a ✓ — long enough to
 * register, short enough not to stall a singer creeping on to the next note. */
const RECORD_FLASH_MS = 700

const justRecordedMidi = ref<number | null>(null)
const { isPending: isRecordFlash, start: startRecordFlash } = useTimeoutFn(
  () => {},
  RECORD_FLASH_MS,
  { immediate: false },
)

/* A new record in the same step is a win. Moving low → high also changes
 * stepRecord (to the empty high record), which must not flash. */
watch(
  [stepRecord, () => props.step],
  ([record, currentStep], [previous, previousStep]) => {
    if (record === null || currentStep !== previousStep || record === previous)
      return

    justRecordedMidi.value = record
    startRecordFlash()
  },
)

/* One line for what to do next. An out-of-tune high note pauses the bar, so
 * that warning wins; otherwise name what the filling bar is about to save.
 * Empty on a paused bar — it would claim progress that isn't happening. */
const isOffPitchWarning = computed(
  () =>
    !isRecordFlash.value &&
    props.step === 'high' &&
    props.sungMidi !== null &&
    !isLiveClean.value,
)
const holdHint = computed(() => {
  if (isOffPitchWarning.value)
    return t('voiceRangeFinder.notCleanYet', { cents: CLOSE_CENTS })

  return !isRecordFlash.value && props.isFilling && props.candidateMidi !== null
    ? t('voiceRangeFinder.keepHolding', {
        note: formatNote(props.candidateMidi),
      })
    : ''
})

/* What the bar and readout show: the win while it flashes, then live again */
const barPercent = computed(() =>
  isRecordFlash.value ? 100 : Math.round(props.progress * 100),
)
const shownMidi = computed(() =>
  isRecordFlash.value ? justRecordedMidi.value : liveMidi.value,
)

const recordText = computed(() => {
  if (stepRecord.value === null) return t('voiceRangeFinder.noRecordYet')

  const note = formatNote(stepRecord.value)

  return props.step === 'low'
    ? t('voiceRangeFinder.lowestSoFar', { note })
    : t('voiceRangeFinder.highestSoFar', { note })
})

/* In a full search Done also skips: past the low step with nothing sung, or
 * out of the high step keeping just the low end. It only stays off when
 * pressing it would save nothing. */
const canFinishStep = computed(() =>
  props.mode === 'both'
    ? props.step === 'low' ||
      props.lowestMidi !== null ||
      props.highestMidi !== null
    : stepRecord.value !== null,
)
</script>

<template>
  <section
    class="flex w-full flex-col items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
    data-testid="voice-range-finder-step"
    :data-step="step"
    :data-record-flash="isRecordFlash"
  >
    <p class="text-center text-sm">
      {{
        step === 'low'
          ? t('voiceRangeFinder.lowPrompt')
          : t('voiceRangeFinder.highPrompt')
      }}
    </p>
    <!--
      Bar and note share the first row, so the note centres on the bar; the
      cents hang in a second row beneath the note without pulling it up.
      The meter has its own column and the note a fixed, start-aligned one
      sized for the widest label (D♯3), so neither the bar nor the meter
      moves as the label changes width. A paused bar dims, so a kept-but-idle
      hold doesn't look like progress. PrimeVue's 1 s width transition is
      switched off: progress already moves every frame, and the transition
      made the bar trail the real hold (never visibly full) and drain on
      reset, which read as failure.
    -->
    <div class="grid w-full grid-cols-[1fr_auto_3rem] items-center gap-x-2">
      <PrimeProgressBar
        class="h-2 transition-opacity"
        :class="{ 'opacity-40': !isFilling && !isRecordFlash }"
        :pt="{ value: { style: { transition: 'none' } } }"
        data-testid="voice-range-finder-hold-bar"
        :data-filling="isFilling"
        :value="barPercent"
        :showValue="false"
      />
      <CentsMeter class="text-xl" :cents="isRecordFlash ? null : liveCents" />
      <span
        class="justify-self-start text-xl font-semibold tabular-nums"
        dir="ltr"
        data-testid="voice-range-finder-live-note"
      >
        {{ shownMidi === null ? '–' : formatNote(shownMidi) }}
      </span>
      <!-- Always rendered so the card keeps its height when the cents vanish -->
      <span
        v-if="isRecordFlash"
        class="col-start-3 justify-self-start text-sm font-semibold text-(--p-green-500)"
        data-testid="voice-range-finder-record-tick"
      >
        ✓
      </span>
      <span
        v-else
        class="col-start-3 justify-self-start text-sm font-medium tabular-nums"
        dir="ltr"
        :style="{ color: liveCentsColor }"
        data-testid="voice-range-finder-live-cents"
      >
        {{ liveCentsText || '&nbsp;' }}
      </span>
    </div>
    <!-- Always rendered so the card keeps its height as the hint comes and goes -->
    <p
      class="min-h-5 text-sm font-medium"
      :class="{ 'text-(--p-orange-400)': isOffPitchWarning }"
      data-testid="voice-range-finder-hold-hint"
      :data-off-pitch="isOffPitchWarning"
    >
      {{ holdHint }}
    </p>
    <p
      class="text-sm"
      :class="
        isRecordFlash ? 'text-(--p-green-500)' : 'text-(--p-text-muted-color)'
      "
      data-testid="voice-range-finder-record"
    >
      {{ recordText }}
    </p>
    <div class="flex items-center gap-2">
      <PrimeButton
        severity="secondary"
        size="small"
        rounded
        text
        @click="emit('cancel')"
      >
        {{ t('voiceRangeFinder.cancel') }}
      </PrimeButton>
      <PrimeButton
        size="small"
        rounded
        :disabled="!canFinishStep"
        data-testid="voice-range-finder-done"
        @click="emit('done')"
      >
        {{ t('voiceRangeFinder.done') }}
      </PrimeButton>
    </div>
  </section>
</template>

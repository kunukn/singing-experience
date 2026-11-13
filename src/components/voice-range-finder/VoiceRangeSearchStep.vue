<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { VOICE_RANGE_HIGHEST_MIDI } from '@/utils/normalizeVoiceRange'
import { useLiveCents } from './useLiveCents'
import {
  centsOffNearest,
  type RangeFinderMode,
  type RangeFinderPauseReason,
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
  pauseReason: RangeFinderPauseReason | null
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

/* Names what the filling bar is about to save, or why a note above the span
 * or a sound with no clear pitch doesn't count. Otherwise empty on a paused bar — it would claim progress that
 * isn't happening. */
const holdHint = computed(() => {
  if (isRecordFlash.value) return ''

  if (props.pauseReason === 'aboveLimit')
    return t('voiceRangeFinder.aboveLimit', {
      note: formatNote(VOICE_RANGE_HIGHEST_MIDI),
    })

  if (props.pauseReason === 'unclear') return t('voiceRangeFinder.unclearNote')

  return props.isFilling && props.candidateMidi !== null
    ? t('voiceRangeFinder.keepHolding', {
        note: formatNote(props.candidateMidi),
      })
    : ''
})

/*
 * Which way to go when the bar pauses. Past-the-record uses the ↓G2 form of the
 * voice type chart's hints, in a neutral colour: it also shows right after each
 * new record, where it means "next, go here", and pitch hues are for tuning
 * (design-rules.md). Out of tune has no note to name, only a direction back to
 * the centre, in the cents colour.
 */
const pauseCue = computed(() => {
  if (isRecordFlash.value || props.sungMidi === null) return null

  if (props.pauseReason === 'notPastRecord' && stepRecord.value !== null) {
    const isLowStep = props.step === 'low'

    return {
      arrow: isLowStep ? '↓' : '↑',
      note: formatNote(stepRecord.value + (isLowStep ? -1 : 1)),
      color: undefined,
    }
  }

  if (props.pauseReason === 'offPitch') {
    return {
      arrow: centsOffNearest(props.sungMidi) > 0 ? '↓' : '↑',
      note: '',
      color: liveCentsColor.value,
    }
  }

  return null
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

/* Names where the singer is. Only a full search has two steps to count. */
const stepHeading = computed(() => {
  const isLowStep = props.step === 'low'
  const end = isLowStep
    ? t('voiceRangeFinder.lowest')
    : t('voiceRangeFinder.highest')

  if (props.mode !== 'both') return end

  const counter = t('voiceRangeFinder.stepOf', {
    current: isLowStep ? 1 : 2,
    total: 2,
  })

  return `${counter} · ${end}`
})

/* The finish button says what pressing it does: the low step of a full search
 * leads on to the high step (Skip while nothing is sung, Next after), and
 * everything else ends the search. */
const finishLabel = computed(() => {
  if (props.mode !== 'both' || props.step !== 'low')
    return t('voiceRangeFinder.done')

  return stepRecord.value === null
    ? t('generic.skip')
    : t('voiceRangeFinder.next')
})

/* In a full search the finish button also skips: past the low step with
 * nothing sung, or out of the high step keeping just the low end. It only
 * stays off when pressing it would save nothing. */
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
    class="relative flex w-full flex-col items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
    data-testid="voice-range-finder-step"
    :data-step="step"
    :data-record-flash="isRecordFlash"
  >
    <!-- px-8 keeps a long heading clear of the ✕ in the corner -->
    <h3
      class="px-8 text-center text-sm font-medium text-(--p-text-muted-color)"
      data-testid="voice-range-finder-step-heading"
    >
      {{ stepHeading }}
    </h3>
    <!-- In the corner, apart from the step's own button: it leaves the whole
         search, not only this step. absolute! beats PrimeVue's own
         position: relative on buttons. -->
    <PrimeButton
      class="absolute! end-2 top-2"
      icon="pi pi-times"
      severity="secondary"
      size="small"
      rounded
      text
      :aria-label="t('voiceRangeFinder.cancel')"
      data-testid="voice-range-finder-cancel"
      @click="emit('cancel')"
    />
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
      hold doesn't look like progress; the cue sits beside the bar in a shared
      box, so it doesn't dim with it. PrimeVue's 1 s width transition is
      switched off: progress already moves every frame, and the transition
      made the bar trail the real hold (never visibly full) and drain on
      reset, which read as failure.
    -->
    <div class="grid w-full grid-cols-[1fr_auto_3rem] items-center gap-x-2">
      <div class="relative">
        <PrimeProgressBar
          class="h-2 transition-opacity"
          :class="{ 'opacity-40': !isFilling && !isRecordFlash }"
          :pt="{
            value: {
              style: { transition: 'none', background: pauseCue?.color },
            },
          }"
          data-testid="voice-range-finder-hold-bar"
          :data-filling="isFilling"
          :data-pause-reason="pauseReason"
          :value="barPercent"
          :showValue="false"
        />
        <span
          v-if="pauseCue"
          class="pointer-events-none absolute inset-0 flex items-center justify-center text-base font-semibold text-(--p-text-color)"
          :style="{ color: pauseCue.color }"
          dir="ltr"
          aria-hidden="true"
          data-testid="voice-range-finder-pause-cue"
        >
          <span class="motion-safe:animate-pulse">{{ pauseCue.arrow }}</span>
          {{ pauseCue.note }}
        </span>
      </div>
      <CentsMeter
        class="text-xl"
        :cents="isRecordFlash ? null : liveCents"
        :color="liveCentsColor"
      />
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
      data-testid="voice-range-finder-hold-hint"
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
    <PrimeButton
      size="small"
      rounded
      :disabled="!canFinishStep"
      data-testid="voice-range-finder-done"
      @click="emit('done')"
    >
      {{ finishLabel }}
    </PrimeButton>
  </section>
</template>

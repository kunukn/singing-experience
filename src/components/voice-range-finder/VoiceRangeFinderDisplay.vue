<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { LARGE_SMALL_BUTTON_ICON_PT } from '@/constants/buttonStyles'
import { MY_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import {
  normalizeVoiceRange,
  VOICE_RANGE_HIGHEST_MIDI,
  VOICE_RANGE_LOWEST_MIDI,
  VOICE_RANGE_MIN_SPAN,
} from '@/utils/normalizeVoiceRange'
import { frequencyToMidi, midiToNoteLabel } from '@/utils/noteUtils'
import { CLOSE_CENTS, cleanTextColor } from '@/utils/pitchColors'
import {
  centsOffNearest,
  isCleanEnough,
  useRangeFinder,
} from './useRangeFinder'
import VoiceTypeComparison from './VoiceTypeComparison.vue'

type Props = {
  /* The real mic on the page, simulated input on the test page */
  detection: {
    frequency: Readonly<Ref<number | null>>
    isClean: Readonly<Ref<boolean>>
    isListening: Readonly<Ref<boolean>>
    error: Readonly<Ref<string | null>>
    start: () => void | Promise<void>
    stop: () => void
  }
}

const props = defineProps<Props>()

const { t } = useI18n()
const { isDark } = useDarkMode()

const { myVoiceRange, setMyVoiceRange, resetMyVoiceRange } = useMyVoiceRange()

/* The app-wide range selection every program shares, so a saved range is
 * already picked the next time the singer opens a game. */
const sharedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

const formatNote = (midi: number) => midiToNoteLabel(midi).label
const formatRange = (midiMin: number, midiMax: number) =>
  `${formatNote(midiMin)}–${formatNote(midiMax)}`

/* C7 down to C2, high to low like every pitch list in the app */
const noteOptions = Array.from(
  { length: VOICE_RANGE_HIGHEST_MIDI - VOICE_RANGE_LOWEST_MIDI + 1 },
  (_, offset) => {
    const midi = VOICE_RANGE_HIGHEST_MIDI - offset

    return { label: formatNote(midi), value: midi }
  },
)

/*
 * Each picker pushes the other end away when the two get closer than an
 * octave, rather than refusing the pick: someone setting F2 as a goal note
 * wants F2, not a select that silently snaps back.
 */
const lowestNote = computed({
  get: () => myVoiceRange.value.midiMin,
  set: (midi: number) => {
    setMyVoiceRange(
      midi,
      Math.max(myVoiceRange.value.midiMax, midi + VOICE_RANGE_MIN_SPAN),
    )
  },
})

const highestNote = computed({
  get: () => myVoiceRange.value.midiMax,
  set: (midi: number) => {
    setMyVoiceRange(
      Math.min(myVoiceRange.value.midiMin, midi - VOICE_RANGE_MIN_SPAN),
      midi,
    )
  },
})

/* A voice-type row in the legend is a shortcut: start from that voice's range */
function adoptVoiceType(rangeIndex: number) {
  const range = VOICE_RANGES[rangeIndex]
  if (!range) return

  setMyVoiceRange(range.midiMin, range.midiMax)
}

const sungMidi = computed(() => {
  const { frequency, isClean, isListening } = props.detection

  return isListening.value && isClean.value && frequency.value
    ? frequencyToMidi(frequency.value)
    : null
})

const finder = useRangeFinder({ sungMidi })
const {
  step,
  mode,
  lowestMidi,
  highestMidi,
  candidateMidi,
  progress,
  isFilling,
} = finder

/* The note being sung right now, or none. Not the hold's candidate: that stays
 * set through silence, and a frozen note would read as still being heard. */
const liveMidi = computed(() =>
  sungMidi.value === null ? null : Math.round(sungMidi.value),
)

/* How far the live note sits from its semitone, in the tuner's colours */
const liveCents = computed(() =>
  sungMidi.value === null ? null : Math.round(centsOffNearest(sungMidi.value)),
)
const liveCentsText = computed(() => {
  if (liveCents.value === null) return ''

  return liveCents.value > 0 ? `+${liveCents.value}¢` : `${liveCents.value}¢`
})
const liveCentsColor = computed(() =>
  liveCents.value === null
    ? undefined
    : cleanTextColor(liveCents.value, isDark.value),
)

/* The high step only counts clean notes, so say which kind this one is */
const isLiveClean = computed(
  () => sungMidi.value !== null && isCleanEnough(sungMidi.value),
)

/* Names what the filling bar is about to do. Shown only while it fills — on a
 * paused bar it would claim progress that isn't happening. */
const holdHint = computed(() =>
  !isRecordFlash.value && isFilling.value && candidateMidi.value !== null
    ? t('voiceRangeFinder.keepHolding', {
        note: formatNote(candidateMidi.value),
      })
    : '',
)

const isSearching = computed(
  () => step.value === 'low' || step.value === 'high',
)
const isJustSaved = ref(false)

const stepRecord = computed(() =>
  step.value === 'low' ? lowestMidi.value : highestMidi.value,
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
watch([stepRecord, step], ([record, currentStep], [previous, previousStep]) => {
  if (record === null || currentStep !== previousStep || record === previous)
    return

  justRecordedMidi.value = record
  startRecordFlash()
})

/* What the bar and readout show: the win while it flashes, then live again */
const barPercent = computed(() =>
  isRecordFlash.value ? 100 : Math.round(progress.value * 100),
)
const shownMidi = computed(() =>
  isRecordFlash.value ? justRecordedMidi.value : liveMidi.value,
)

const recordText = computed(() => {
  if (stepRecord.value === null) return t('voiceRangeFinder.noRecordYet')

  const note = formatNote(stepRecord.value)

  return step.value === 'low'
    ? t('voiceRangeFinder.lowestSoFar', { note })
    : t('voiceRangeFinder.highestSoFar', { note })
})

const sungRange = computed(() =>
  lowestMidi.value === null || highestMidi.value === null
    ? null
    : {
        midiMin: Math.min(lowestMidi.value, highestMidi.value),
        midiMax: Math.max(lowestMidi.value, highestMidi.value),
      },
)

/* What "Use this" will save — the sung range, stretched to an octave if needed */
const foundRange = computed(() =>
  sungRange.value
    ? normalizeVoiceRange(sungRange.value.midiMin, sungRange.value.midiMax)
    : null,
)

const isWidened = computed(
  () =>
    !!sungRange.value &&
    !!foundRange.value &&
    (sungRange.value.midiMin !== foundRange.value.midiMin ||
      sungRange.value.midiMax !== foundRange.value.midiMax),
)

async function startSearch(only?: 'low' | 'high') {
  isJustSaved.value = false
  finder.start(only)
  await props.detection.start()
}

/* A one-end search saves straight away: there is no sung range to review, and
 * the result screen would credit the singer with the end they didn't sing.
 * The picker setters keep the octave span, as a hand pick would. */
function saveSingleEnd() {
  if (mode.value === 'high' && highestMidi.value !== null)
    highestNote.value = highestMidi.value
  if (mode.value === 'low' && lowestMidi.value !== null)
    lowestNote.value = lowestMidi.value
  markSaved()
}

function finishStep() {
  finder.next()
  if (step.value !== 'result') return

  props.detection.stop()
  if (mode.value !== 'both') saveSingleEnd()
}

function cancelSearch() {
  finder.cancel()
  props.detection.stop()
}

function saveFoundRange() {
  if (!foundRange.value) return

  setMyVoiceRange(foundRange.value.midiMin, foundRange.value.midiMax)
  markSaved()
}

function markSaved() {
  sharedRangeIndex.value = MY_RANGE_INDEX
  isJustSaved.value = true
  finder.cancel()
}

/* A refused mic prompt ends the search instead of leaving it listening to nothing */
watch(
  () => props.detection.error.value,
  (error) => {
    if (error && isSearching.value) finder.cancel()
  },
)

onUnmounted(() => {
  props.detection.stop()
})
</script>

<template>
  <div class="flex w-full max-w-md flex-col items-center gap-4">
    <section
      class="flex w-full flex-col items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
      data-testid="my-range-card"
    >
      <h2 class="text-sm font-medium text-(--p-text-muted-color)">
        {{ t('voiceRanges.myRange') }}
      </h2>
      <p
        class="text-3xl font-semibold tabular-nums"
        dir="ltr"
        data-testid="my-range-notes"
      >
        {{ formatRange(myVoiceRange.midiMin, myVoiceRange.midiMax) }}
      </p>

      <!-- Mic buttons sit outside the labels, so a tap isn't forwarded to the select -->
      <div class="flex w-full flex-col gap-2">
        <div class="flex items-center gap-1">
          <label class="flex flex-1 items-center justify-between gap-3">
            <span class="text-sm">{{ t('voiceRangeFinder.highest') }}</span>
            <PrimeSelect
              v-model="highestNote"
              :options="noteOptions"
              optionLabel="label"
              optionValue="value"
              size="small"
              scrollHeight="300px"
              class="min-w-24"
              data-testid="my-range-highest"
            />
          </label>
          <PrimeButton
            icon="pi pi-microphone"
            :pt="LARGE_SMALL_BUTTON_ICON_PT"
            severity="secondary"
            size="small"
            rounded
            text
            :disabled="isSearching"
            :aria-label="`${t('voiceRangeFinder.findBySinging')}: ${t('voiceRangeFinder.highest')}`"
            data-testid="my-range-sing-highest"
            @click="startSearch('high')"
          />
        </div>
        <div class="flex items-center gap-1">
          <label class="flex flex-1 items-center justify-between gap-3">
            <span class="text-sm">{{ t('voiceRangeFinder.lowest') }}</span>
            <PrimeSelect
              v-model="lowestNote"
              :options="noteOptions"
              optionLabel="label"
              optionValue="value"
              size="small"
              scrollHeight="300px"
              class="min-w-24"
              data-testid="my-range-lowest"
            />
          </label>
          <PrimeButton
            icon="pi pi-microphone"
            :pt="LARGE_SMALL_BUTTON_ICON_PT"
            severity="secondary"
            size="small"
            rounded
            text
            :disabled="isSearching"
            :aria-label="`${t('voiceRangeFinder.findBySinging')}: ${t('voiceRangeFinder.lowest')}`"
            data-testid="my-range-sing-lowest"
            @click="startSearch('low')"
          />
        </div>
      </div>

      <VoiceTypeComparison
        :midiMin="myVoiceRange.midiMin"
        :midiMax="myVoiceRange.midiMax"
        @selectRange="adoptVoiceType"
      />

      <PrimeButton
        severity="secondary"
        size="small"
        rounded
        text
        @click="resetMyVoiceRange"
      >
        {{ t('voiceRangeFinder.reset') }}
      </PrimeButton>
    </section>

    <template v-if="step === 'idle'">
      <PrimeButton
        severity="success"
        rounded
        data-testid="voice-range-finder-start"
        @click="startSearch()"
      >
        {{ t('voiceRangeFinder.findBySinging') }}
      </PrimeButton>
      <p
        v-if="isJustSaved"
        class="text-sm font-medium text-(--p-green-500)"
        data-testid="voice-range-finder-saved"
      >
        {{ t('voiceRangeFinder.saved') }}
      </p>
    </template>

    <section
      v-else-if="isSearching"
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
        Fixed note column so the bar doesn't jump as the label changes width.
        A paused bar dims, so a kept-but-idle hold doesn't look like progress.
        PrimeVue's 1 s width transition is switched off: progress already moves
        every frame, and the transition made the bar trail the real hold (never
        visibly full) and drain on reset, which read as failure.
      -->
      <div class="grid w-full grid-cols-[1fr_4rem] items-center gap-x-3">
        <PrimeProgressBar
          class="h-2 transition-opacity"
          :class="{ 'opacity-40': !isFilling && !isRecordFlash }"
          :pt="{ value: { style: { transition: 'none' } } }"
          data-testid="voice-range-finder-hold-bar"
          :data-filling="isFilling"
          :value="barPercent"
          :showValue="false"
        />
        <span
          class="justify-self-end text-xl font-semibold tabular-nums"
          dir="ltr"
          data-testid="voice-range-finder-live-note"
        >
          {{ shownMidi === null ? '–' : formatNote(shownMidi) }}
        </span>
        <!-- Always rendered so the card keeps its height when the cents vanish -->
        <span
          v-if="isRecordFlash"
          class="col-start-2 justify-self-end text-sm font-semibold text-(--p-green-500)"
          data-testid="voice-range-finder-record-tick"
        >
          ✓
        </span>
        <span
          v-else
          class="col-start-2 justify-self-end text-sm font-medium tabular-nums"
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
        v-if="step === 'high' && liveCents !== null"
        class="text-sm font-medium"
        :class="isLiveClean ? 'text-(--p-green-500)' : 'text-(--p-orange-400)'"
        data-testid="voice-range-finder-clean"
        :data-clean="isLiveClean"
      >
        {{
          isLiveClean
            ? t('voiceRangeFinder.cleanCounts')
            : t('voiceRangeFinder.notCleanYet', { cents: CLOSE_CENTS })
        }}
      </p>
      <p
        class="text-sm"
        :class="
          isRecordFlash
            ? 'font-semibold text-(--p-green-500)'
            : 'text-(--p-text-muted-color)'
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
          @click="cancelSearch"
        >
          {{ t('voiceRangeFinder.cancel') }}
        </PrimeButton>
        <PrimeButton
          size="small"
          rounded
          :disabled="stepRecord === null"
          data-testid="voice-range-finder-done"
          @click="finishStep"
        >
          {{ t('voiceRangeFinder.done') }}
        </PrimeButton>
      </div>
    </section>

    <section
      v-else-if="step === 'result' && sungRange && foundRange"
      class="flex w-full flex-col items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
      data-testid="voice-range-finder-result"
    >
      <p class="text-center">
        {{
          t('voiceRangeFinder.resultTitle', {
            range: formatRange(sungRange.midiMin, sungRange.midiMax),
          })
        }}
      </p>
      <p
        v-if="isWidened"
        class="text-center text-sm text-(--p-text-muted-color)"
        data-testid="voice-range-finder-widened"
      >
        {{
          t('voiceRangeFinder.widened', {
            range: formatRange(foundRange.midiMin, foundRange.midiMax),
          })
        }}
      </p>
      <div class="flex items-center gap-2">
        <PrimeButton
          severity="secondary"
          size="small"
          rounded
          @click="startSearch()"
        >
          {{ t('voiceRangeFinder.tryAgain') }}
        </PrimeButton>
        <PrimeButton
          severity="success"
          size="small"
          rounded
          data-testid="voice-range-finder-use"
          @click="saveFoundRange"
        >
          {{ t('voiceRangeFinder.useThis') }}
        </PrimeButton>
      </div>
    </section>

    <p v-if="detection.error.value" class="text-sm text-(--p-red-400)">
      {{ detection.error.value }}
    </p>
  </div>
</template>

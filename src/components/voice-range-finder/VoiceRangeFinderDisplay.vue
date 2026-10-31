<script setup lang="ts">
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
const { step, lowestMidi, highestMidi, candidateMidi, progress } = finder

/* The note being sung right now; between notes, the one the bar is holding.
 * Not the candidate alone — an out-of-tune high note never becomes one, and
 * the readout must still show the singer what they are singing. */
const liveMidi = computed(() =>
  sungMidi.value === null ? candidateMidi.value : Math.round(sungMidi.value),
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

/* Names what the filling bar is about to do. Shown only while the singer is
 * on that note — a paused bar under a different note would read as a lie. */
const holdHint = computed(() =>
  candidateMidi.value !== null &&
  progress.value > 0 &&
  liveMidi.value === candidateMidi.value
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

async function startSearch() {
  isJustSaved.value = false
  finder.start()
  await props.detection.start()
}

function finishStep() {
  finder.next()
  if (step.value === 'result') props.detection.stop()
}

function cancelSearch() {
  finder.cancel()
  props.detection.stop()
}

function saveFoundRange() {
  if (!foundRange.value) return

  setMyVoiceRange(foundRange.value.midiMin, foundRange.value.midiMax)
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

      <div class="flex w-full flex-col gap-2">
        <label class="flex items-center justify-between gap-3">
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
        <label class="flex items-center justify-between gap-3">
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
        @click="startSearch"
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
    >
      <p class="text-center text-sm">
        {{
          step === 'low'
            ? t('voiceRangeFinder.lowPrompt')
            : t('voiceRangeFinder.highPrompt')
        }}
      </p>
      <div class="flex w-full items-center gap-3">
        <PrimeProgressBar
          class="h-2 flex-1"
          :value="Math.round(progress * 100)"
          :showValue="false"
        />
        <!-- Fixed width so the bar doesn't jump as the cents change -->
        <div class="flex w-16 flex-col items-end tabular-nums" dir="ltr">
          <span
            class="text-xl font-semibold"
            data-testid="voice-range-finder-live-note"
          >
            {{ liveMidi === null ? '–' : formatNote(liveMidi) }}
          </span>
          <span
            class="text-sm font-medium"
            :style="{ color: liveCentsColor }"
            data-testid="voice-range-finder-live-cents"
          >
            {{ liveCentsText || '&nbsp;' }}
          </span>
        </div>
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
        class="text-sm text-(--p-text-muted-color)"
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
          @click="startSearch"
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

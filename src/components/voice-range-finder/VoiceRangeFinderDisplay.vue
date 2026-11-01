<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { MY_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import {
  type MidiRange,
  normalizeVoiceRange,
} from '@/utils/normalizeVoiceRange'
import { frequencyToMidi } from '@/utils/noteUtils'
import { CLOSE_CENTS, cleanTextColor } from '@/utils/pitchColors'
import {
  centsOffNearest,
  isCleanEnough,
  useRangeFinder,
} from './useRangeFinder'
import VoiceRangeExplorePanel from './VoiceRangeExplorePanel.vue'
import VoiceRangeSlots from './VoiceRangeSlots.vue'
import VoiceTypeComparison from './VoiceTypeComparison.vue'
import {
  formatNote,
  formatRange,
  VOICE_RANGE_NOTE_OPTIONS,
  withHighest,
  withLowest,
} from './voiceRangeNotes'

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
  /* Test page: "See your voice" drives `detection` instead of opening the mic */
  simulateIdlePreview?: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()
const { isDark } = useDarkMode()

const route = useRoute()
const router = useRouter()

const TAB_VALUES = ['range', 'explore'] as const
type FinderTab = (typeof TAB_VALUES)[number]
const DEFAULT_TAB: FinderTab = 'range'

/* Active tab lives only in the URL (?tab=range|explore), as on /pitch-detector.
 * replace() keeps tab switches out of the browser history. */
const activeTab = computed<FinderTab>({
  get() {
    const tab = route.query.tab

    return TAB_VALUES.includes(tab as FinderTab)
      ? (tab as FinderTab)
      : DEFAULT_TAB
  },
  set(tab) {
    router.replace({ query: { ...route.query, tab } })
  },
})

const { myVoiceRange, setMyVoiceRange } = useMyVoiceRange()

/* The app-wide range selection every program shares, so a saved range is
 * already picked the next time the singer opens a game. */
const sharedRangeIndex = useVoiceRangeIndex('syng.rangeIndex')

/* Each picker pushes the other end away rather than refusing the pick (see withLowest) */
const lowestNote = computed({
  get: () => myVoiceRange.value.midiMin,
  set: (midi: number) => {
    const { midiMin, midiMax } = withLowest(myVoiceRange.value, midi)
    setMyVoiceRange(midiMin, midiMax)
  },
})

const highestNote = computed({
  get: () => myVoiceRange.value.midiMax,
  set: (midi: number) => {
    const { midiMin, midiMax } = withHighest(myVoiceRange.value, midi)
    setMyVoiceRange(midiMin, midiMax)
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

const isSearching = computed(
  () => step.value === 'low' || step.value === 'high',
)

/* "See your voice" — the live pitch on the chart between searches, so the
 * singer sees where their voice sits before pressing Find. During a search the
 * search's own detector draws the line. The setter keeps the shared setting
 * writable, so useIdlePreview can flip it off when permission is denied; the
 * getter is always false on a simulated page, so the real mic never opens. */
const { isPreviewEnabled } = useSettings()

const isRealIdlePreviewEnabled = computed({
  get: () => isPreviewEnabled.value && !props.simulateIdlePreview,
  set: (enabled: boolean) => {
    isPreviewEnabled.value = enabled
  },
})

const { previewFrequency, micPermission } = useIdlePreview({
  isGameActive: isSearching,
  isEnabled: isRealIdlePreviewEnabled,
})

/* Simulated idle preview: the one detector runs between searches while the
 * toggle is on. A search starting keeps the detector startSearch just started,
 * since this watcher flushes after it. */
const isSimulatedIdlePreviewOn = computed(
  () =>
    !!props.simulateIdlePreview && isPreviewEnabled.value && !isSearching.value,
)
watch(
  isSimulatedIdlePreviewOn,
  (isOn) => {
    if (isOn) void props.detection.start()
    else if (!isSearching.value) props.detection.stop()
  },
  { immediate: true },
)

const chartLiveMidi = computed(() => {
  if (isSearching.value || props.simulateIdlePreview) return sungMidi.value

  return previewFrequency.value === null
    ? null
    : frequencyToMidi(previewFrequency.value)
})

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

/* One line for what to do next. An out-of-tune high note pauses the bar, so
 * that warning wins; otherwise name what the filling bar is about to save.
 * Empty on a paused bar — it would claim progress that isn't happening. */
const isOffPitchWarning = computed(
  () =>
    !isRecordFlash.value &&
    step.value === 'high' &&
    sungMidi.value !== null &&
    !isLiveClean.value,
)
const holdHint = computed(() => {
  if (isOffPitchWarning.value)
    return t('voiceRangeFinder.notCleanYet', { cents: CLOSE_CENTS })

  return !isRecordFlash.value && isFilling.value && candidateMidi.value !== null
    ? t('voiceRangeFinder.keepHolding', {
        note: formatNote(candidateMidi.value),
      })
    : ''
})

/* How long the ✓ beside the range confirms a sung save */
const SAVED_FLASH_MS = 2000

const {
  isPending: isJustSaved,
  start: startSavedFlash,
  stop: stopSavedFlash,
} = useTimeoutFn(() => {}, SAVED_FLASH_MS, { immediate: false })

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
  stopSavedFlash()
  finder.start(only)
  await props.detection.start()
}

/* One end found — a one-end search, or a full search with an end skipped —
 * saves straight away: there is no sung range to review, and the result
 * screen would credit the singer with the end they didn't sing. The picker
 * setters keep the octave span, as a hand pick would. */
function saveSingleEnd() {
  if (highestMidi.value !== null) highestNote.value = highestMidi.value
  if (lowestMidi.value !== null) lowestNote.value = lowestMidi.value
  markSaved()
}

/* In a full search Done also skips: past the low step with nothing sung, or
 * out of the high step keeping just the low end. It only stays off when
 * pressing it would save nothing. */
const canFinishStep = computed(() =>
  mode.value === 'both'
    ? step.value === 'low' ||
      lowestMidi.value !== null ||
      highestMidi.value !== null
    : stepRecord.value !== null,
)

function finishStep() {
  finder.next()
  if (step.value !== 'result') return

  props.detection.stop()
  if (!sungRange.value) saveSingleEnd()
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

/* A saved slot is a quick hand pick: confirm it like a save, but leave any
 * running search alone — markSaved would cancel it. */
function applySlot(range: MidiRange) {
  setMyVoiceRange(range.midiMin, range.midiMax)
  sharedRangeIndex.value = MY_RANGE_INDEX
  startSavedFlash()
}

function markSaved() {
  sharedRangeIndex.value = MY_RANGE_INDEX
  startSavedFlash()
  finder.cancel()
}

/* Both panels stay mounted, so a result waiting for "Use this" survives a
 * switch — but a running search would keep listening behind a hidden tab. */
watch(activeTab, () => {
  if (isSearching.value) cancelSearch()
})

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
  <div class="flex w-full flex-col items-center gap-4">
    <PrimeTabs
      v-model:value="activeTab"
      class="flex w-full flex-col gap-4"
      data-testid="voice-range-finder-tabs"
    >
      <PrimeTabList class="w-full">
        <PrimeTab value="range" data-testid="voice-range-finder-tab-range">
          {{ t('voiceRanges.myRange') }}
        </PrimeTab>
        <PrimeTab value="explore" data-testid="voice-range-finder-tab-explore">
          {{ t('voiceRangeFinder.tabs.explore') }}
        </PrimeTab>
      </PrimeTabList>

      <PrimeTabPanels class="w-full p-0">
        <PrimeTabPanel value="range" class="flex flex-col items-center gap-4">
          <section
            class="flex w-full flex-col gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
            data-testid="my-range-card"
          >
            <!-- Stat-tile header: small label over the range -->
            <div class="flex flex-col items-start">
              <h2 class="text-sm font-medium text-(--p-text-muted-color)">
                {{ t('voiceRanges.myRange') }}
              </h2>
              <!-- aria-live reads a new range aloud, standing in for the ✓ a screen reader can't see -->
              <p
                class="relative text-3xl font-semibold tabular-nums"
                dir="ltr"
                aria-live="polite"
                data-testid="my-range-notes"
              >
                {{ formatRange(myVoiceRange.midiMin, myVoiceRange.midiMax) }}
                <!-- Absolutely placed so the range stays put while the ✓ comes and goes -->
                <Transition
                  leaveActiveClass="transition-opacity duration-500"
                  leaveToClass="opacity-0"
                >
                  <span
                    v-if="isJustSaved"
                    aria-hidden="true"
                    data-testid="my-range-saved"
                    class="absolute start-full top-1/2 ms-2 -translate-y-1/2 text-xl text-(--p-green-500)"
                  >
                    ✓
                  </span>
                </Transition>
              </p>
            </div>

            <!--
              Sing buttons sit outside the labels, so a tap isn't forwarded to the select.
              They say "Sing" rather than show a mic: the mic icon means "See my voice"
              everywhere else. Label | select | Sing columns are shared through subgrid,
              so both selects line up after the longest label in any language. They are
              filled pills, as in Sing the Keys: text-only, they read as a caption beside
              the bordered selects. gap-x-1 keeps each pill tight to its select, so the
              two read as one control; the label's me-2 gives it the wider gap.
            -->
            <div
              class="grid grid-cols-[auto_auto_auto] items-center gap-x-1 gap-y-2 self-start"
            >
              <div class="col-span-3 grid grid-cols-subgrid items-center">
                <label class="col-span-2 grid grid-cols-subgrid items-center">
                  <span class="me-2 text-sm">{{
                    t('voiceRangeFinder.highest')
                  }}</span>
                  <PrimeSelect
                    v-model="highestNote"
                    :options="VOICE_RANGE_NOTE_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    size="small"
                    scrollHeight="300px"
                    class="min-w-24"
                    data-testid="my-range-highest"
                  />
                </label>
                <PrimeButton
                  :label="t('generic.sing')"
                  severity="secondary"
                  size="small"
                  rounded
                  :disabled="isSearching"
                  :aria-label="`${t('generic.sing')}: ${t('voiceRangeFinder.highest')}`"
                  data-testid="my-range-sing-highest"
                  @click="startSearch('high')"
                />
              </div>
              <div class="col-span-3 grid grid-cols-subgrid items-center">
                <label class="col-span-2 grid grid-cols-subgrid items-center">
                  <span class="me-2 text-sm">{{
                    t('voiceRangeFinder.lowest')
                  }}</span>
                  <PrimeSelect
                    v-model="lowestNote"
                    :options="VOICE_RANGE_NOTE_OPTIONS"
                    optionLabel="label"
                    optionValue="value"
                    size="small"
                    scrollHeight="300px"
                    class="min-w-24"
                    data-testid="my-range-lowest"
                  />
                </label>
                <PrimeButton
                  :label="t('generic.sing')"
                  severity="secondary"
                  size="small"
                  rounded
                  :disabled="isSearching"
                  :aria-label="`${t('generic.sing')}: ${t('voiceRangeFinder.lowest')}`"
                  data-testid="my-range-sing-lowest"
                  @click="startSearch('low')"
                />
              </div>
            </div>

            <VoiceRangeSlots
              :midiMin="myVoiceRange.midiMin"
              :midiMax="myVoiceRange.midiMax"
              @applyRange="applySlot"
            />

            <VoiceTypeComparison
              :midiMin="myVoiceRange.midiMin"
              :midiMax="myVoiceRange.midiMax"
              :liveMidi="chartLiveMidi"
              @selectRange="adoptVoiceType"
            />
          </section>

          <div v-if="step === 'idle'" class="flex items-center gap-2">
            <PrimeButton
              severity="success"
              size="small"
              rounded
              data-testid="voice-range-finder-start"
              @click="startSearch()"
            >
              {{ t('voiceRangeFinder.findBySinging') }}
            </PrimeButton>
            <!-- Only two buttons in this row, so the text fits from xs up -->
            <PreviewToggle
              v-model="isPreviewEnabled"
              :disabled="!simulateIdlePreview && micPermission === 'denied'"
              labelFrom="xs"
            />
          </div>

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
        The meter has its own column and the note a fixed, start-aligned one
        sized for the widest label (D♯3), so neither the bar nor the meter
        moves as the label changes width. A paused bar dims, so a kept-but-idle hold doesn't look like progress.
        PrimeVue's 1 s width transition is switched off: progress already moves
        every frame, and the transition made the bar trail the real hold (never
        visibly full) and drain on reset, which read as failure.
      -->
            <div
              class="grid w-full grid-cols-[1fr_auto_3rem] items-center gap-x-2"
            >
              <PrimeProgressBar
                class="h-2 transition-opacity"
                :class="{ 'opacity-40': !isFilling && !isRecordFlash }"
                :pt="{ value: { style: { transition: 'none' } } }"
                data-testid="voice-range-finder-hold-bar"
                :data-filling="isFilling"
                :value="barPercent"
                :showValue="false"
              />
              <CentsMeter
                class="text-xl"
                :cents="isRecordFlash ? null : liveCents"
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
              :class="{ 'text-(--p-orange-400)': isOffPitchWarning }"
              data-testid="voice-range-finder-hold-hint"
              :data-off-pitch="isOffPitchWarning"
            >
              {{ holdHint }}
            </p>
            <p
              class="text-sm"
              :class="
                isRecordFlash
                  ? 'text-(--p-green-500)'
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
                :disabled="!canFinishStep"
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
        </PrimeTabPanel>

        <PrimeTabPanel value="explore" class="flex flex-col items-center gap-4">
          <VoiceRangeExplorePanel
            :liveMidi="chartLiveMidi"
            :isListening="isPreviewEnabled"
          />
          <!-- Same state as My range's toggle, so switching tabs doesn't change
               it. Alone on its row here, so the label always fits. -->
          <PreviewToggle
            v-model="isPreviewEnabled"
            :disabled="!simulateIdlePreview && micPermission === 'denied'"
            labelFrom="always"
          />
        </PrimeTabPanel>
      </PrimeTabPanels>
    </PrimeTabs>

    <p v-if="detection.error.value" class="text-sm text-(--p-red-400)">
      {{ detection.error.value }}
    </p>
  </div>
</template>

<script setup lang="ts">
import {
  buildGuitarTuningGroups,
  DEFAULT_GUITAR_TUNING_ID,
  guitarTuningStringPairs,
  guitarTuningStrings,
  type GuitarTuningId,
  type GuitarTuningString,
} from '@/utils/guitarTunings'
import {
  noteToFrequency,
  toAccidentalGlyph,
  type NoteInfo,
  type NoteName,
} from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'
import TunerCentsDeviationBar from './TunerCentsDeviationBar.vue'
import { PREVIEW_INTERVAL_MS } from './tunerConstants'

type Props = {
  noteInfo: NoteInfo | null
  frequency: number | null
  clarity: number
  isClean: boolean
  isListening: boolean
  error: string | null
  start: () => void | Promise<void>
  stop: () => void
}

const props = defineProps<Props>()

const { t } = useI18n()
const { isDark } = useDarkMode()

const noteColor = computed(() =>
  props.noteInfo && props.isClean
    ? cleanTextColor(props.noteInfo.cents, isDark.value)
    : null,
)

const centsColor = computed(() =>
  props.noteInfo && props.isClean
    ? cleanTextColor(props.noteInfo.cents, isDark.value)
    : null,
)

/* Tunings come from the shared catalogue, which the guitar fretboard reads too —
 * the two pages must never disagree about what DADGAD is. Not persisted: a tuner
 * is picked up for the guitar in front of you, not for a saved preference. */
const selectedTuning = ref<GuitarTuningId>(DEFAULT_GUITAR_TUNING_ID)

/* Split either side of the headstock photo: strings 4, 5, 6 down the
 * inline-start edge and 3, 2, 1 down the inline-end one. */
const stringPairs = computed(() =>
  guitarTuningStringPairs(selectedTuning.value),
)
const leftStrings = computed(() => stringPairs.value.left)
const rightStrings = computed(() => stringPairs.value.right)

const TUNING_GROUPS = computed(() => buildGuitarTuningGroups(t))

const { playBellFeedback } = useTonePlayer()
const {
  play: playGuitarSample,
  playAt: playGuitarSampleAt,
  prepare: prepareGuitarSamples,
  stop: stopGuitarSample,
  isPlaying,
} = useGuitarSampler()

/* The preview plays low to high; the catalogue already stores strings 6→1
 * ascending, so no sort is needed. */
const sortedTuningStrings = computed(() =>
  guitarTuningStrings(selectedTuning.value),
)

/* Lead-in before the first scheduled note. Gives Tone.js time to settle the
 * audio-clock schedule so the first note's audio + draw fire together rather
 * than racing against the current audio time. */
const SEQUENCE_LEAD_IN_S = 0.05

/* Multiplier on PREVIEW_INTERVAL_MS — instrument decay before the button resets. */
const TAIL_RING_MULTIPLIER = 6

const isPlayingSequence = ref(false)
const sequenceActiveString = ref<string | null>(null)

function stopSequence() {
  defaultToneEngine.cancelScheduled(0)
  isPlayingSequence.value = false
  sequenceActiveString.value = null
  stopGuitarSample()
}

async function playTuningSequence() {
  stopSequence()
  const steps = sortedTuningStrings.value
  await defaultToneEngine.warmUp()
  await prepareGuitarSamples(steps)

  isPlayingSequence.value = true
  const intervalS = PREVIEW_INTERVAL_MS / 1000
  const startAt = defaultToneEngine.getNow() + SEQUENCE_LEAD_IN_S

  steps.forEach((s, i) => {
    const when = startAt + i * intervalS
    playGuitarSampleAt(s.note, s.octave, when)
    defaultToneEngine.scheduleDraw(() => {
      if (!isPlayingSequence.value) return

      sequenceActiveString.value = `${s.note}${s.octave}`
    }, when)
  })

  const endAt =
    startAt + (steps.length - 1) * intervalS + intervalS * TAIL_RING_MULTIPLIER
  defaultToneEngine.scheduleDraw(() => {
    isPlayingSequence.value = false
    sequenceActiveString.value = null
    stopGuitarSample()
  }, endAt)
}

function toggleTuningPreview() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    playTuningSequence()
  }
}

const activeString = ref<string | null>(null)
const confirmedInTuneString = ref<GuitarTuningString | null>(null)

async function playGuitarString(note: NoteName, octave: number) {
  lastGuitarClickTime = Date.now()
  await playGuitarSample(note, octave)
  activeString.value = `${note}${octave}`
}

watch(isPlaying, (playing) => {
  if (!playing) activeString.value = null
})

function isStringInTune(note: NoteName, octave: number): boolean {
  return (
    props.isListening &&
    props.isClean &&
    props.noteInfo != null &&
    props.noteInfo.note === note &&
    props.noteInfo.octave === octave &&
    Math.abs(props.noteInfo.cents) <= 10 // ±10 cents — acceptable tuning for a guitarist
  )
}

const inTuneString = computed<GuitarTuningString | null>(
  () =>
    [...leftStrings.value, ...rightStrings.value].find((s) =>
      isStringInTune(s.note, s.octave),
    ) ?? null,
)

/*
 * Bell feedback guards:
 * - IN_TUNE_SUSTAIN_MS: pitch must hold steady for 500 ms before the bell fires,
 *   so transient wobbles into the ±10-cent window don't trigger a ding.
 * - SAME_STRING_COOLDOWN_MS: suppresses repeat dings for the same string after
 *   the bell has fired; pitch detection at ~15-30×/sec would otherwise cause
 *   rapid-fire sounds as pitch drifts in/out of the window.
 * - GUITAR_BUTTON_BELL_MUTE_MS: suppresses the bell after the user taps a
 *   reference string button, since they will hear that tone directly.
 * Switching strings (G3 → B3) resets the sustain timer immediately.
 */
const IN_TUNE_SUSTAIN_MS = 500 // pitch must hold for 500 ms before bell fires
const HIGHLIGHT_DEBOUNCE_MS = 250 // matches Do Re Mi GRACE_PERIOD_MS — absorbs pitch jitter
const SAME_STRING_COOLDOWN_MS = 2000
const GUITAR_BUTTON_BELL_MUTE_MS = 3000 // suppress bell after tapping a reference string

let lastBellKey: string | null = null
let lastBellTime = 0
let lastGuitarClickTime = 0
let pendingBellTimer: ReturnType<typeof setTimeout> | null = null
let pendingBellKey: string | null = null
let highlightTimer: ReturnType<typeof setTimeout> | null = null
let highlightKey: string | null = null

watch(inTuneString, (current) => {
  if (!current) {
    clearTimeout(pendingBellTimer ?? undefined)
    pendingBellTimer = null
    pendingBellKey = null
    return
  }

  const key = `${current.note}${current.octave}`

  if (key === pendingBellKey) return // timer already running for this string

  clearTimeout(pendingBellTimer ?? undefined)
  pendingBellKey = key

  pendingBellTimer = setTimeout(() => {
    pendingBellTimer = null
    pendingBellKey = null

    const now = Date.now()

    if (now - lastGuitarClickTime < GUITAR_BUTTON_BELL_MUTE_MS) return

    if (key === lastBellKey && now - lastBellTime < SAME_STRING_COOLDOWN_MS)
      return

    lastBellKey = key
    lastBellTime = now
    playBellFeedback(noteToFrequency(current.note, current.octave), 0.5)
  }, IN_TUNE_SUSTAIN_MS)
})

watch(inTuneString, (current) => {
  if (!current) {
    clearTimeout(highlightTimer ?? undefined)
    highlightTimer = null
    highlightKey = null
    confirmedInTuneString.value = null
    return
  }

  const key = `${current.note}${current.octave}`
  if (key === highlightKey) return

  clearTimeout(highlightTimer ?? undefined)
  confirmedInTuneString.value = null
  highlightKey = key

  highlightTimer = setTimeout(() => {
    highlightTimer = null
    highlightKey = null
    confirmedInTuneString.value = current
  }, HIGHLIGHT_DEBOUNCE_MS)
})

onMounted(() => {
  void prewarmStandardTuning()
})

onUnmounted(() => {
  stopSequence()
  clearTimeout(pendingBellTimer ?? undefined)
  pendingBellTimer = null
  pendingBellKey = null
  clearTimeout(highlightTimer ?? undefined)
  highlightTimer = null
  highlightKey = null
  confirmedInTuneString.value = null
})

watch(selectedTuning, () => {
  stopSequence()
  clearTimeout(pendingBellTimer ?? undefined)
  pendingBellTimer = null
  pendingBellKey = null
  lastBellKey = null
  lastBellTime = 0
  clearTimeout(highlightTimer ?? undefined)
  highlightTimer = null
  highlightKey = null
  confirmedInTuneString.value = null
})

watch(
  () => props.isListening,
  (listening) => {
    if (listening) stopSequence()
  },
)
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <div class="flex items-center gap-2">
      <label class="text-sm text-(--p-text-muted-color)">
        {{ t('tuner.tuning') }}
      </label>
      <PrimeSelect
        v-model="selectedTuning"
        :options="TUNING_GROUPS"
        optionLabel="label"
        optionValue="value"
        optionGroupLabel="label"
        optionGroupChildren="items"
        size="small"
        scrollHeight="370px"
        class="min-w-31.5"
      >
        <template #optiongroup="{ index, option }">
          <div
            :data-index="index + 1"
            class="select-tuning-option-group flex items-center"
            :class="{ 'mt-4': index !== 0 }"
          >
            <div>{{ option.label }}</div>
          </div>
        </template>
        <template #option="{ option }">
          <div class="flex items-center justify-between gap-3">
            <div class="font-medium">
              <span class="block min-w-8">
                {{ option.label }}
              </span>
            </div>
          </div>
        </template>
      </PrimeSelect>

      <PrimeButton
        v-if="!isListening"
        severity="secondary"
        size="small"
        rounded
        icon="pi pi-volume-up"
        class="min-h-8.75 min-w-8.75"
        :class="{ 'string-playing': isPlayingSequence }"
        :aria-label="t('generic.previewButton')"
        @click="toggleTuningPreview"
      />
    </div>

    <div class="mb-4">
      <PrimeButton
        v-if="!isListening"
        severity="success"
        size="small"
        rounded
        class="min-w-20"
        @click="start"
      >
        {{ t('generic.start') }}
      </PrimeButton>
      <PrimeButton
        v-else
        severity="danger"
        size="small"
        rounded
        class="min-w-20"
        @click="stop"
      >
        {{ t('generic.stop') }}
      </PrimeButton>
    </div>

    <!-- Instrument tuner -->
    <div class="flex items-stretch">
      <div
        class="instruments-string-buttons instrument-string-buttons-left relative flex flex-col"
      >
        <PrimeButton
          v-for="s in leftStrings"
          :key="`${s.note}${s.octave}`"
          severity="secondary"
          size="small"
          rounded
          :class="{
            'string-highlighted':
              confirmedInTuneString?.note === s.note &&
              confirmedInTuneString?.octave === s.octave,
            'string-playing':
              activeString === `${s.note}${s.octave}` ||
              sequenceActiveString === `${s.note}${s.octave}`,
          }"
          @click="playGuitarString(s.note, s.octave)"
          >{{ toAccidentalGlyph(s.note) }}{{ s.octave }}
        </PrimeButton>
      </div>
      <img
        src="@/assets/images/guitar-head.png"
        alt=""
        class="mt-0 h-64 w-auto"
        :class="{
          'instrument-is-dark': isDark,
          'instrument-is-light': !isDark,
        }"
      />

      <div
        class="instruments-string-buttons instruments-string-buttons-right relative flex flex-col"
      >
        <PrimeButton
          v-for="s in rightStrings"
          :key="`${s.note}${s.octave}`"
          severity="secondary"
          size="small"
          rounded
          :class="{
            'string-highlighted':
              confirmedInTuneString?.note === s.note &&
              confirmedInTuneString?.octave === s.octave,
            'string-playing':
              activeString === `${s.note}${s.octave}` ||
              sequenceActiveString === `${s.note}${s.octave}`,
          }"
          @click="playGuitarString(s.note, s.octave)"
          >{{ toAccidentalGlyph(s.note) }}{{ s.octave }}
        </PrimeButton>
      </div>
    </div>

    <p v-if="error && !isListening" class="text-sm text-(--p-red-400)">
      {{ error }}
    </p>

    <div
      v-if="isListening"
      class="flex w-full items-center justify-center gap-4"
    >
      <TunerCentsDeviationBar
        :cents="noteInfo && isClean ? noteInfo.cents : null"
        :threshold="10"
        :maxRange="100"
        :isVisible="true"
        :highLabel="t('pitchDetector.sharp')"
        :lowLabel="t('pitchDetector.flat')"
        height="h-30 sm:h-40"
      />

      <div class="flex min-w-38 flex-col items-start justify-center">
        <div
          v-if="noteInfo && isClean"
          class="transition-colors duration-150"
          :style="{ color: noteColor ?? undefined }"
        >
          <span class="text-7xl font-bold tracking-tight md:text-8xl">
            {{ toAccidentalGlyph(noteInfo.note) }}
          </span>
          <span class="mt-2 inline-block align-top text-4xl font-light">
            {{ noteInfo.octave }}
          </span>
        </div>
        <div v-else class="text-(--p-text-muted-color)">
          <p class="text-sm">{{ t('pitchDetector.listening') }}</p>
        </div>

        <div
          v-if="noteInfo && isClean"
          class="mt-1 flex items-center gap-1 text-xs tabular-nums"
          :style="{ color: centsColor ?? undefined }"
        >
          <span>{{ t('pitchDetector.cents') }}</span>
          <span class="min-w-6 text-end tabular-nums">
            {{ noteInfo.cents > 0 ? '+' : '' }}{{ noteInfo.cents }}
          </span>
        </div>
      </div>

      <div
        class="grid grid-cols-[auto_auto] items-center gap-x-1 text-(--p-text-muted-color) tabular-nums"
      >
        <span class="min-w-12 text-end tabular-nums">{{
          frequency != null ? Math.round(frequency) : '-'
        }}</span>
        <span class="text-(--p-surface-500)">{{ t('generic.hz') }}</span>

        <span class="text-end tabular-nums"
          >{{ Math.round(clarity * 100) }}%</span
        >
        <span class="text-(--p-surface-500)">{{
          t('pitchDetector.clarity')
        }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.instruments-string-buttons {
  width: 1px;

  > * {
    position: absolute;
    aspect-ratio: 1;
    width: 2.625rem;
  }

  > *:nth-child(1) {
    top: 12%;
  }

  > *:nth-child(2) {
    top: 35%;
  }
  > *:nth-child(3) {
    top: 58%;
  }
}

.instrument-string-buttons-left {
  > * {
    right: 4px;
  }
}

.instruments-string-buttons-right {
  > * {
    left: 4px;
  }
}

.string-highlighted {
  box-shadow:
    0 0 0 3px var(--p-green-400),
    0 0 12px 4px var(--p-green-500);
  transition: box-shadow 0.15s ease;
}

.string-playing {
  box-shadow:
    0 0 0 3px var(--p-blue-400),
    0 0 12px 4px var(--p-blue-500);
  transition: box-shadow 0.15s ease;
}

.select-tuning-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.instrument-is-light {
  filter: invert(0.2); /* shifts pure black → dark grey (~rgb 51,51,51) */
}

.instrument-is-dark {
  filter: invert(1) brightness(0.4);
}
</style>

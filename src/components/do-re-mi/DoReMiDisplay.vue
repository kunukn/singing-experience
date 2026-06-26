<script setup lang="ts">
import type { ScaleMode } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import type { DoReMiGameResult } from './useDoReMiGame'
import { SCALE_MODE_OPTIONS } from './useDoReMiGame'
import { useDoReMiPlaySequence } from './useDoReMiPlaySequence'
import { useDoReMiTonesLog } from './useDoReMiTonesLog'

type Props = {
  game: DoReMiGameResult
  titleSuffix?: string
  overridePreviewMidi?: number | null
  overridePreviewNoteLabel?: string | null
  overridePreviewFrequency?: number | null
  disableIdlePreview?: boolean
}

const props = defineProps<Props>()

const durationSec = defineModel<number>('durationSec', { required: true })
const startOffset = defineModel<number>('startOffset', { required: true })
const scaleMode = defineModel<ScaleMode>('scaleMode', { required: true })

const { t } = useI18n()

const {
  scaleSteps,
  currentStepIndex,
  targetStep,
  targetFrequency,
  currentFrequency,
  noteInfo: gameNoteInfo,
  isClean: gameIsClean,
  centsFromTarget,
  holdProgress,
  tooLowMs,
  tooHighMs,
  elapsedMs,
  isComplete,
  gameState,
  isSingingCorrectNote,
  isListening,
  error,
  start,
  stop,
  reset,
  setHoldDuration,
  setStartingSemitoneOffset,
  setScaleMode,
} = props.game

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const { isPreviewEnabled } = useSettings()
const showDoReMiTarget = useLocalStorage('syng.showDoReMiTarget', true)

/* Force-disable idle preview (and the mic it would open) in simulated test pages */
const effectivePreviewEnabled = computed(
  () => !props.disableIdlePreview && isPreviewEnabled.value,
)

const isGameActive = computed(() => isListening.value || isComplete.value)

const {
  previewMidi: rawPreviewMidi,
  previewFrequency: rawPreviewFrequency,
  previewNoteLabel: rawPreviewNoteLabel,
  micPermission,
  triggerDeafPeriod: triggerIdleDeafPeriod,
} = useIdlePreview({
  isGameActive,
  isPlayingSequence,
  isEnabled: effectivePreviewEnabled,
})

/* Compute MIDI range from the scale steps */
const scaleMidiMin = computed(() => {
  const steps = scaleSteps.value
  if (steps.length === 0) return 0

  const first = steps[0]

  return (first.octave + 1) * 12 + NOTE_NAMES.indexOf(first.note)
})

const scaleMidiMax = computed(() => {
  const steps = scaleSteps.value
  if (steps.length === 0) return 0

  const last = steps[steps.length - 1]

  return (last.octave + 1) * 12 + NOTE_NAMES.indexOf(last.note)
})

/* Hide the preview indicator when the pitch is far outside the scale range.
 * Allow a few semitones beyond the range so DoReMiScale can show a clamped edge indicator. */
const previewMidi = computed(() => {
  if (isComplete.value) return null

  let midi: number | null = null

  if (isGameActive.value && isPreviewEnabled.value) {
    midi = props.overridePreviewMidi ?? gameNoteInfo.value?.midiNote ?? null
  } else {
    midi = props.overridePreviewMidi ?? rawPreviewMidi.value
  }

  if (midi === null || midi === undefined) return null

  // 12 semitones = one octave of tolerance beyond each edge
  if (midi < scaleMidiMin.value - 12 || midi > scaleMidiMax.value + 12)
    return null

  return midi
})

const previewNoteLabel = computed(() => {
  if (previewMidi.value === null) return null

  if (isGameActive.value && isPreviewEnabled.value) {
    if (props.overridePreviewNoteLabel) return props.overridePreviewNoteLabel
    if (!gameIsClean.value) return null

    const info = gameNoteInfo.value
    if (!info) return null

    return `${info.note}${info.octave}`
  }

  return props.overridePreviewNoteLabel ?? rawPreviewNoteLabel.value
})

const previewFrequency = computed(() => {
  if (previewMidi.value === null) return null

  if (isGameActive.value && isPreviewEnabled.value) {
    return props.overridePreviewFrequency ?? currentFrequency.value
  }

  return props.overridePreviewFrequency ?? rawPreviewFrequency.value
})

const { fireConfetti } = useConfettiStore()

/* Debug-only: log every new detected tone during a playing run on the
 * [DoReMiTones] channel. No-op unless VITE_DEBUG_LOG=1. */
useDoReMiTonesLog({
  noteInfo: gameNoteInfo,
  isPlaying: computed(() => gameState.value === 'playing'),
  elapsedMs,
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))

const selectedScaleModeLabel = computed(
  () =>
    SCALE_MODE_OPTIONS.find((o) => o.id === scaleMode.value)?.label ??
    scaleMode.value,
)

const startToneLabel = computed(() => {
  const first = scaleSteps.value[0]
  if (!first) return ''

  return `${first.note}${first.octave}`
})

watch(
  durationSec,
  (sec) => {
    setHoldDuration(sec * 1000)
  },
  { immediate: true },
)

watch(
  startOffset,
  (offset) => {
    setStartingSemitoneOffset(offset)
  },
  { immediate: true },
)

watch(
  scaleMode,
  (mode) => {
    setScaleMode(mode)
  },
  { immediate: true },
)

watch(isComplete, (complete) => {
  if (complete) {
    fireConfetti()
  }
})

function handleStart() {
  stopSequence()
  start()
  debugLog('[DoReMi] game start', {
    scaleMode: scaleMode.value,
    holdDurationSec: durationSec.value,
    startOffset: startOffset.value,
    startTone: startToneLabel.value,
    scaleMidiMin: scaleMidiMin.value,
    scaleMidiMax: scaleMidiMax.value,
    steps: scaleSteps.value.length,
  })
}

function handleStop() {
  stopSequence()
  stop()
}

function handleReset() {
  stopSequence()
  reset()
}

/* Re-arm the deaf window when the sequence finishes so the preview doesn't
 * flash immediately after the last note — the 1000ms timer started at
 * sequence-begin has already expired by the time the sequence ends. */
watch(isPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    triggerIdleDeafPeriod()
  }
})

function toggleDoReMi() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    triggerIdleDeafPeriod()
    playSequence(scaleSteps.value)
  }
}

function handleTonePlayed() {
  triggerIdleDeafPeriod()
}

onUnmounted(() => {
  stopSequence()
  stop()
})
</script>

<template>
  <div
    class="do-re-mi-display relative flex grow flex-col items-center gap-4 pb-4"
    data-testid="do-re-mi-display"
  >
    <!-- Fixed-height header so the subtitle collapsing on 'complete'
      (v-show → display:none) doesn't shift everything below it. -->
    <div class="flex min-h-17 flex-col items-center gap-4">
      <h1 class="flex items-center gap-2 text-2xl font-semibold">
        <span>🎶</span>
        <span>
          {{ t('doReMi.title') }}{{ titleSuffix ? ` ${titleSuffix}` : '' }}
        </span>
      </h1>
      <p
        v-show="gameState !== 'complete'"
        class="text-sm text-(--p-text-muted-color)"
      >
        {{ t('doReMi.singNoteFor', { seconds: durationSec }) }}
      </p>
    </div>

    <slot :gameState="gameState" :targetStep="targetStep" />

    <!-- Reserve the height of the tallest panel (idle / complete) so the
      DoReMiScale below keeps a fixed position when switching to the much
      shorter playing panel. Content stays top-aligned. -->
    <div class="flex w-full flex-col items-center sm:min-h-44">
      <!-- State: 1 -->
      <DoReMiIdlePanel
        v-if="gameState === 'idle'"
        v-model:startOffset="startOffset"
        v-model:scaleMode="scaleMode"
        v-model:durationSec="durationSec"
        v-model:isPreviewEnabled="isPreviewEnabled"
        v-model:showDoReMiTarget="showDoReMiTarget"
        :isPlayingSequence="isPlayingSequence"
        :micPermission="micPermission"
        :error="error"
        @start="handleStart"
        @toggleDoReMi="toggleDoReMi"
      />

      <!-- State: 2 -->
      <DoReMiPlayingPanel
        v-else-if="gameState === 'playing'"
        :elapsedSeconds="elapsedSeconds"
        @stop="handleStop"
      />

      <!-- State: 3 -->
      <DoReMiCompletePanel
        v-else-if="gameState === 'complete'"
        :durationSec="durationSec"
        :elapsedSeconds="elapsedSeconds"
        :selectedScaleModeLabel="selectedScaleModeLabel"
        :startToneLabel="startToneLabel"
        @reset="handleReset"
      />
    </div>

    <!-- Scale visualization -->
    <DoReMiScale
      :scaleSteps="scaleSteps"
      :currentStepIndex="currentStepIndex"
      :holdProgress="holdProgress"
      :isComplete="isComplete"
      :isStarted="isListening"
      :isPlayingSequence="isPlayingSequence"
      :currentPlayingIndex="currentPlayingIndex"
      :previewMidi="previewMidi"
      :previewFrequency="previewFrequency"
      :previewNoteLabel="previewNoteLabel"
      :onTonePlayed="handleTonePlayed"
      :scaleMode="scaleMode"
      :showDoReMiTarget="showDoReMiTarget"
      :targetStep="targetStep"
      :targetFrequency="targetFrequency"
      :currentFrequency="currentFrequency"
      :centsFromTarget="centsFromTarget"
      :isSingingCorrectNote="isSingingCorrectNote"
      :tooLowMs="tooLowMs"
      :tooHighMs="tooHighMs"
    />
  </div>
</template>

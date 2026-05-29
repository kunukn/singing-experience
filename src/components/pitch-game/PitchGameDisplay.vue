<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import type { ToneMode } from '@/composables/toneEngine'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import { midiToNoteLabel } from '@/utils/noteUtils'
import PitchGamePitchDisplay from './PitchGamePitchDisplay.vue'
import PitchGameCompletePanel from './PitchGameCompletePanel.vue'
import PitchGameIdlePanel from './PitchGameIdlePanel.vue'
import PitchGamePlayingPanel from './PitchGamePlayingPanel.vue'
import { useGame } from './usePitchGame'

type PitchDetectionInput = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  clarity: Readonly<Ref<number>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

type Props = {
  detection: PitchDetectionInput
  overridePreviewMidi?: number | null
  overridePreviewNoteLabel?: string | null
  overridePreviewFrequency?: number | null
  disableIdlePreview?: boolean
}

const props = defineProps<Props>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const holdDurationSec = defineModel<number>('holdDurationSec', {
  required: true,
})
const gameDurationSec = defineModel<number>('gameDurationSec', {
  required: true,
})

const { t } = useI18n()

const { setToneMode, warmUp } = useTonePlayer()

const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed<ToneMode>({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    /* Re-resume the AudioContext while we're still inside the user-gesture
     * frame from selecting a tone — iOS Safari can suspend the context when
     * an overlay opens, and a later setTimeout-driven resume is silently
     * refused. */
    void warmUp().catch((err) =>
      debugLog('[TonePlayer] warmUp on tone-mode change failed', err),
    )
  },
})
setToneMode(storedToneMode.value)

const { frequency, noteInfo, isListening, isClean, error, start, stop } =
  props.detection

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)

const { isPreviewEnabled } = useSettings()

/* Force-disable idle preview (and the mic it would open) in simulated test pages */
const effectivePreviewEnabled = computed(
  () => !props.disableIdlePreview && isPreviewEnabled.value,
)

const gameMidiMin = computed(() => selectedRange.value.midiMin)
const gameMidiMax = computed(() => selectedRange.value.midiMax)
const holdDurationMs = computed(() => holdDurationSec.value * 1000)
const gameDurationMs = computed(() => gameDurationSec.value * 1000)

const {
  targets,
  score,
  summary,
  gameState,
  elapsedMs,
  startGame,
  stopGame,
  reset: resetGame,
} = useGame({
  noteInfo,
  isClean,
  midiMin: gameMidiMin,
  midiMax: gameMidiMax,
  voiceRange: selectedRange,
  holdDurationMs,
  gameDurationMs,
  onHit: (target) => {
    const origin = pitchDisplayRef.value?.getTargetViewportOrigin(target.id)
    if (origin) fireMicroConfetti(origin)
    else fireMicroConfetti()
  },
  onEnd: () => stop(),
})

const pitchDisplayRef = ref<InstanceType<typeof PitchGamePitchDisplay> | null>(
  null,
)
const { fireMicroConfetti } = useConfetti()
const { fireConfetti } = useConfettiStore()

const isGameActive = computed(() => gameState.value !== 'idle')

/* Snapshot of the live pitch at the moment the game ends, so the pickup line
 * and circle remain frozen on the Complete panel instead of vanishing. We
 * track the most recent clean note continuously because `stop()` runs inside
 * the same tick as the state transition and can clear `noteInfo` before the
 * gameState watcher fires. */
const frozenPreviewMidi = ref<number | null>(null)
const frozenPreviewNoteLabel = ref<string | null>(null)
const frozenPreviewFrequency = ref<number | null>(null)

const lastCleanMidi = ref<number | null>(null)
const lastCleanNoteLabel = ref<string | null>(null)
const lastCleanFrequency = ref<number | null>(null)

watch(
  () => [noteInfo.value, isClean.value] as const,
  ([info, clean]) => {
    if (!isGameActive.value) return
    if (!info || !clean) return

    lastCleanMidi.value = info.midiNote
    lastCleanNoteLabel.value = `${info.note}${info.octave}`
    lastCleanFrequency.value = info.frequency
  },
)

watch(
  () => gameState.value,
  (state) => {
    if (state === 'complete') {
      /* Only celebrate a natural finish — a manual Stop must not fire confetti. */
      if (score.value >= 1 && summary.value?.endReason === 'natural') {
        fireConfetti()
      }

      frozenPreviewMidi.value = lastCleanMidi.value
      frozenPreviewNoteLabel.value = lastCleanNoteLabel.value
      frozenPreviewFrequency.value = lastCleanFrequency.value
    } else if (state === 'idle') {
      frozenPreviewMidi.value = null
      frozenPreviewNoteLabel.value = null
      frozenPreviewFrequency.value = null
      lastCleanMidi.value = null
      lastCleanNoteLabel.value = null
      lastCleanFrequency.value = null
    }
  },
)

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const rangeNotes = computed(() => {
  const bottom = midiToNoteLabel(selectedRange.value.midiMin)
  const top = midiToNoteLabel(selectedRange.value.midiMax)

  return [
    { solfege: '', note: bottom.note, octave: bottom.octave },
    { solfege: '', note: top.note, octave: top.octave },
  ]
})

const highlightedMidi = computed(() => {
  const index = currentPlayingIndex.value
  if (index === 0) return selectedRange.value.midiMin
  if (index === 1) return selectedRange.value.midiMax

  return null
})

const {
  previewMidi: rawPreviewMidi,
  previewNoteLabel,
  previewFrequency: rawPreviewFrequency,
  micPermission,
  triggerDeafPeriod: triggerIdleDeafPeriod,
} = useIdlePreview({
  isGameActive,
  isPlayingSequence,
  isEnabled: effectivePreviewEnabled,
})

function toggleSequence() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    triggerIdleDeafPeriod()
    playSequence(rangeNotes.value)
  }
}

/* Re-arm the deaf window when the sequence finishes so the preview doesn't
 * flash immediately after the last note. */
watch(isPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    triggerIdleDeafPeriod()
  }
})

/*
 * Pass through the midi value so out-of-range notes render as a clamped line
 * at the chart boundary. On the Complete panel show the frozen snapshot so
 * the pickup line stays visible at the player's final pitch.
 */
const previewMidi = computed(() => {
  let midi: number | null

  if (gameState.value === 'complete') {
    midi = frozenPreviewMidi.value
  } else if (isListening.value) {
    midi = props.overridePreviewMidi ?? noteInfo.value?.midiNote ?? null
  } else {
    midi = props.overridePreviewMidi ?? rawPreviewMidi.value
  }

  if (midi === null) return null
  if (
    midi < selectedRange.value.midiMin - 12 ||
    midi > selectedRange.value.midiMax + 12
  )
    return null

  return midi
})

const effectivePreviewNoteLabel = computed(() => {
  if (previewMidi.value === null) return null

  if (gameState.value === 'complete') {
    return frozenPreviewNoteLabel.value
  }

  if (isListening.value) {
    if (props.overridePreviewNoteLabel) return props.overridePreviewNoteLabel
    if (!isClean.value) return null

    const info = noteInfo.value
    if (!info) return null

    return `${info.note}${info.octave}`
  }

  return props.overridePreviewNoteLabel ?? previewNoteLabel.value
})

const previewFrequency = computed(() => {
  if (previewMidi.value === null) return null

  if (gameState.value === 'complete') {
    return frozenPreviewFrequency.value
  }

  if (isListening.value) {
    return props.overridePreviewFrequency ?? frequency.value
  }

  return props.overridePreviewFrequency ?? rawPreviewFrequency.value
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))

async function handleStart() {
  stopSequence()
  resetGame()
  await start()
  startGame()
}

function handleStop() {
  stopGame('manual')
}

function handleReset() {
  stopSequence()
  resetGame()
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
    class="flex flex-1 flex-col items-center gap-4"
    data-testid="pitch-game-display"
  >
    <div class="flex min-h-40 w-full flex-col items-center justify-center">
      <PitchGameIdlePanel
        v-if="gameState === 'idle'"
        v-model:rangeIndex="rangeIndex"
        v-model:toneMode="toneMode"
        v-model:isPreviewEnabled="isPreviewEnabled"
        v-model:holdDurationSec="holdDurationSec"
        v-model:gameDurationSec="gameDurationSec"
        :rangeOptions="rangeOptions"
        :rangeLabel="t('generic.voiceRange')"
        :micPermission="micPermission"
        :error="error"
        :isPlayingSequence="isPlayingSequence"
        @start="handleStart"
        @toggleSequence="toggleSequence"
      />

      <PitchGamePlayingPanel
        v-else-if="gameState === 'playing'"
        :score="score"
        :totalTargets="targets.length"
        :elapsedSeconds="elapsedSeconds"
        @stop="handleStop"
      />

      <PitchGameCompletePanel
        v-else-if="gameState === 'complete' && summary"
        :score="summary.score"
        :totalTargets="summary.totalTargets"
        :durationSec="summary.durationMs / 1000"
        :elapsedSeconds="elapsedSeconds"
        :voiceRangeLabel="t(summary.voiceRangeLabelKey)"
        :voiceRangeNoteRange="summary.voiceRangeNoteRange"
        @reset="handleReset"
      />
    </div>

    <slot />

    <PitchGamePitchDisplay
      ref="pitchDisplayRef"
      :noteInfo="noteInfo"
      :isClean="isClean"
      :isListening="isListening"
      :midiMin="selectedRange.midiMin"
      :midiMax="selectedRange.midiMax"
      :previewMidi="previewMidi"
      :previewNoteLabel="effectivePreviewNoteLabel"
      :previewFrequency="previewFrequency"
      :highlightedMidi="highlightedMidi"
      :targets="targets"
      :simplifyChart="gameState !== 'idle'"
      @tonePlayed="handleTonePlayed"
    />
  </div>
</template>

<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { midiToNoteLabel } from '@/utils/noteUtils'
import type { WarmUpGameResult, WarmUpPatternId } from './useWarmUpGame'
import WarmUpChart from './WarmUpChart.vue'
import WarmUpSettingsRow from './WarmUpSettingsRow.vue'

type Props = {
  game: WarmUpGameResult
  overridePreviewMidi?: number | null
  overridePreviewNoteLabel?: string | null
  overridePreviewFrequency?: number | null
  disableIdlePreview?: boolean
}

const props = defineProps<Props>()

const durationSec = defineModel<number>('durationSec', { required: true })
const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const sequenceCount = defineModel<number>('sequenceCount', { required: true })
const semitoneStep = defineModel<number>('semitoneStep', { required: true })
const patternId = defineModel<WarmUpPatternId>('patternId', { required: true })

const {
  phase,
  currentTranspositionIndex,
  currentNoteIndex,
  phraseNotesMidi,
  phraseGridMidis,
  targetMidi,
  startToneLabel,
  holdProgress,
  elapsedMs,
  isComplete,
  isPlayingSequence: gameIsPlayingSequence,
  currentPlayingIndex: gameCurrentPlayingIndex,
  isSingingCorrectNote,
  isListening,
  isDeaf: gameIsDeaf,
  triggerDeafPeriod,
  midiMin,
  midiMax,
  noteInfo,
  currentFrequency,
  error,
  start,
  stop,
  reset,
  setHoldDuration,
  setRangeIndex,
  setSequenceCount,
  setSemitoneStep,
  setPattern,
} = props.game

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

/* True whenever any reference phrase is sounding — either the game-driven
 * playback or the idle-state preview button. Used to mute the chart's
 * mic-driven preview line so we don't visualise the singer's voice while
 * they're meant to be listening. */
const isAnySequencePlaying = computed(
  () => isPlayingSequence.value || gameIsPlayingSequence.value,
)

const { isPreviewEnabled } = useSettings()

/* Force-disable idle preview (and the mic it would open) in simulated test pages */
const effectivePreviewEnabled = computed(
  () => !props.disableIdlePreview && isPreviewEnabled.value,
)

const isGameActive = computed(() => isListening.value || isComplete.value)

const {
  previewMidi,
  previewFrequency,
  micPermission,
  triggerDeafPeriod: triggerIdleDeafPeriod,
} = useIdlePreview({
  isGameActive,
  isPlayingSequence: isAnySequencePlaying,
  isEnabled: effectivePreviewEnabled,
})

const currentMidi = computed(() => noteInfo.value?.midiNote ?? null)

const chartCurrentMidi = computed(() => {
  if (isListening.value) {
    if (gameIsDeaf.value || isAnySequencePlaying.value) return null

    return currentMidi.value
  }

  const midi = props.overridePreviewMidi ?? previewMidi.value
  if (midi === null) return null

  /* Allow up to one octave outside range to render as a clamped edge line. */
  if (midi < midiMin.value - 12 || midi > midiMax.value + 12) return null

  return midi
})

const chartCurrentFrequency = computed(() => {
  if (isListening.value) {
    if (gameIsDeaf.value || isAnySequencePlaying.value) return null

    return currentFrequency.value ?? null
  }

  return props.overridePreviewFrequency ?? previewFrequency.value
})

/* Highlight the note currently being played by the reference sequence */
const highlightedMidi = computed(() => {
  /* Game-driven phrase playback */
  if (gameIsPlayingSequence.value) {
    const idx = gameCurrentPlayingIndex.value
    if (idx < 0) return null

    const notes = phraseNotesMidi.value
    if (idx >= notes.length) return null

    return notes[idx]
  }

  /* User-triggered phrase preview from idle */
  const idx = currentPlayingIndex.value
  if (idx < 0) return null

  const previewNotes = phraseNotesMidi.value
  if (idx >= previewNotes.length) return null

  return previewNotes[idx]
})

type GameState = 'idle' | 'playing' | 'complete'

const gameState = computed<GameState>(() => {
  if (isComplete.value) return 'complete'
  if (phase.value !== 'idle') return 'playing'

  return 'idle'
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))

const { t } = useI18n()

const voiceTypeLabel = computed(() =>
  t(VOICE_RANGES[rangeIndex.value]?.labelKey ?? 'voiceRanges.everyone'),
)

watch(
  durationSec,
  (sec) => {
    setHoldDuration(sec * 1000)
  },
  { immediate: true },
)

watch(
  rangeIndex,
  (index) => {
    setRangeIndex(index)
  },
  { immediate: true },
)

watch(
  sequenceCount,
  (count) => {
    setSequenceCount(count)
  },
  { immediate: true },
)

watch(
  semitoneStep,
  (step) => {
    setSemitoneStep(step)
  },
  { immediate: true },
)

watch(
  patternId,
  (id) => {
    setPattern(id)
  },
  { immediate: true },
)

const { fireConfetti } = useConfettiStore()

watch(isComplete, (complete) => {
  if (complete) {
    fireConfetti()
  }
})

/* Re-arm the idle preview deaf window when our reference playback ends. */
watch(gameIsPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    triggerIdleDeafPeriod()
  }
})

watch(isPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    triggerIdleDeafPeriod()
  }
})

watch(isListening, (started) => {
  if (!started) return

  setTimeout(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, 0)
})

watch(isAnySequencePlaying, (playing) => {
  if (!playing) return

  setTimeout(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, 0)
})

function previewPhraseScaleSteps() {
  return phraseNotesMidi.value.map((midi) => {
    const info = midiToNoteLabel(midi)

    return { solfege: '', note: info.note, octave: info.octave }
  })
}

function handleStart() {
  stopSequence()
  start()
}

function handleStop() {
  stopSequence()
  stop()
}

function handleReset() {
  stopSequence()
  reset()
}

function togglePhrasePreview() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    triggerIdleDeafPeriod()
    playSequence(previewPhraseScaleSteps())
  }
}

function handleTonePlayed() {
  triggerDeafPeriod()
  triggerIdleDeafPeriod()
}

onUnmounted(() => {
  stopSequence()
  stop()
})
</script>

<template>
  <div
    class="warm-up-display flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="warm-up-display"
    :data-state="gameState"
  >
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>🎙️</span>
      <span>{{ $t('warmUp.title') }}</span>
    </h1>
    <p
      v-show="gameState !== 'complete'"
      class="text-sm text-(--p-text-muted-color)"
    >
      {{ $t('warmUp.subtitle') }}
    </p>

    <!-- State: idle -->
    <div
      v-if="gameState === 'idle'"
      class="flex w-full flex-col items-center gap-4"
    >
      <WarmUpSettingsRow
        v-model:patternId="patternId"
        v-model:rangeIndex="rangeIndex"
        v-model:durationSec="durationSec"
        v-model:sequenceCount="sequenceCount"
        v-model:semitoneStep="semitoneStep"
      />

      <div class="flex w-full flex-wrap items-center justify-center gap-2">
        <PrimeButton
          class="min-w-24"
          severity="success"
          size="small"
          rounded
          @click="handleStart"
        >
          {{ $t('generic.play') }}
        </PrimeButton>

        <PrimeButton
          class="min-w-24"
          :class="{ 'toggle-sequence-idle': !isPlayingSequence }"
          :severity="isPlayingSequence ? 'warn' : 'secondary'"
          size="small"
          rounded
          @click="togglePhrasePreview"
        >
          {{ isPlayingSequence ? $t('generic.muteButton') : '♪' }}
        </PrimeButton>

        <ToggleIconButton
          v-model="isPreviewEnabled"
          iconOn="pi pi-microphone"
          iconOff="pi pi-microphone"
          :label="$t('generic.previewSoundLabel')"
          :disabled="micPermission === 'denied'"
        />
      </div>

      <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>
    </div>

    <!-- State: playing -->
    <div
      v-else-if="gameState === 'playing'"
      class="flex w-full flex-col items-center gap-2"
    >
      <div class="flex items-center gap-2">
        <PrimeButton
          class="min-w-24"
          severity="danger"
          size="small"
          rounded
          @click="handleStop"
        >
          {{ $t('generic.stop') }}
        </PrimeButton>

        <PrimeButton
          class="min-w-24"
          :class="{ 'toggle-sequence-idle': !isPlayingSequence }"
          :severity="isPlayingSequence ? 'warn' : 'secondary'"
          :disabled="gameIsPlayingSequence"
          size="small"
          rounded
          @click="togglePhrasePreview"
        >
          {{ isPlayingSequence ? $t('generic.muteButton') : '♪' }}
        </PrimeButton>
      </div>

      <div class="flex items-center gap-4">
        <p
          class="min-w-20 text-end font-mono text-lg text-(--p-text-muted-color) tabular-nums"
        >
          ⏱ {{ elapsedSeconds }}s
        </p>
        <PrimeTag severity="secondary" rounded>
          <span class="tabular-nums">
            {{ currentTranspositionIndex + 1 }}/{{ sequenceCount }}
          </span>
        </PrimeTag>
        <PrimeTag rounded>
          <span class="tabular-nums">
            {{ currentNoteIndex + 1 }}/{{ phraseNotesMidi.length }}
          </span>
        </PrimeTag>
      </div>

      <p class="text-sm text-(--p-text-muted-color)">
        <span v-if="phase === 'playingReference'">{{
          $t('warmUp.listeningToReference')
        }}</span>
        <span v-else-if="phase === 'transitioning'">{{
          $t('warmUp.nextPhrase')
        }}</span>
        <span v-else>{{ $t('warmUp.singHighlightedNote') }}</span>
      </p>
    </div>

    <!-- State: complete -->
    <div
      v-else-if="gameState === 'complete'"
      class="flex w-full flex-col items-center gap-4 sm:min-h-72"
    >
      <div class="text-6xl">🎉</div>
      <h2 class="text-3xl font-bold text-(--p-green-400)">
        {{ $t('warmUp.done') }}
      </h2>
      <div class="flex flex-col items-center gap-1">
        <p class="text-(--p-surface-400) dark:text-(--p-surface-300)">
          {{ voiceTypeLabel }} — {{ $t('warmUp.startToneInline') }}
          <span class="font-mono">{{ startToneLabel }}</span>
          · {{ sequenceCount }} {{ $t('warmUp.sequencesUnit') }} ·
          <span class="font-mono">{{ durationSec }}s</span>
          {{ $t('warmUp.perTone') }} ·
          <span class="font-mono">{{ semitoneStep }}</span>
          {{ $t('warmUp.semitonesUnit') }}
        </p>
      </div>
      <p class="text-lg text-(--p-text-muted-color)">
        {{ $t('doReMi.time') }}
        <span class="font-mono text-(--p-text-color) tabular-nums">
          {{ elapsedSeconds }}s
        </span>
      </p>
      <PrimeButton
        severity="success"
        size="small"
        rounded
        class="min-w-24"
        @click="handleReset"
      >
        {{ $t('generic.restart') }}
      </PrimeButton>
    </div>

    <!-- Note chart (warm-up specific: only phrase notes labeled) -->
    <WarmUpChart
      v-if="gameState !== 'complete'"
      :targetMidi="phase === 'listening' ? targetMidi : null"
      :currentMidi="chartCurrentMidi"
      :currentFrequency="chartCurrentFrequency"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :gridMidis="phraseGridMidis"
      :isSingingCorrectNote="isSingingCorrectNote"
      :holdProgress="holdProgress"
      :highlightedMidi="highlightedMidi"
      :onTonePlayed="handleTonePlayed"
    />
  </div>
</template>

<style scoped lang="css">
.toggle-sequence-idle {
  padding-block: 0;
  font-size: 1.2rem;
}
</style>

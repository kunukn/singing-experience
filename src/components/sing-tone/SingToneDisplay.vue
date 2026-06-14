<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { NOTE_NAMES } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import SingToneChart from './SingToneChart.vue'
import SingToneSettingsRow from './SingToneSettingsRow.vue'
import type { singToneResult } from './useSingTone'
import { TOO_LOW_OR_HIGH_HINT_MS } from './useSingTone'

type Props = {
  game: singToneResult
  overridePreviewMidi?: number | null
  overridePreviewNoteLabel?: string | null
  overridePreviewFrequency?: number | null
  disableIdlePreview?: boolean
}

const props = defineProps<Props>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const durationSec = defineModel<number>('durationSec', { required: true })
const totalRounds = defineModel<number>('totalRounds', { required: true })

const { t } = useI18n()

const {
  targetMidi,
  targetFrequency,
  targetNoteLabel,
  completedCount,
  totalRounds: gameTotalRounds,
  noteInfo,
  currentFrequency,
  centsFromTarget,
  holdProgress,
  tooLowMs,
  tooHighMs,
  elapsedMs,
  isComplete,
  gameState,
  isSingingCorrectNote,
  isDeaf,
  isListening,
  error,
  midiMin,
  midiMax,
  start,
  stop,
  reset,
  setHoldDuration,
  setTotalRounds,
  setMidiRange,
  triggerDeafPeriod,
  targetTonePlayCount,
} = props.game

const currentMidi = computed(() => noteInfo.value?.midiNote ?? null)

const isGameActive = computed(() => isListening.value || isComplete.value)

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const { isPreviewEnabled } = useSettings()
const showSingToneTarget = useLocalStorage('syng.showSingToneTarget', true)

/* Force-disable idle preview (and the mic it would open) in simulated test pages */
const effectivePreviewEnabled = computed(
  () => !props.disableIdlePreview && isPreviewEnabled.value,
)

const {
  previewMidi,
  previewFrequency,
  micPermission,
  triggerDeafPeriod: triggerIdleDeafPeriod,
} = useIdlePreview({
  isGameActive,
  isPlayingSequence,
  isEnabled: effectivePreviewEnabled,
})

const chartCurrentMidi = computed(() => {
  if (isListening.value) {
    /* Prepare phase: while the game is in the deaf window after playing the
     * target tone, hide the singer line so the user listens instead of being
     * distracted by the mic picking up the speaker's own output. */
    if (isDeaf.value) return null

    return currentMidi.value
  }

  const midi = props.overridePreviewMidi ?? previewMidi.value
  if (midi === null) return null

  /*
   * Pass through the midi value so out-of-range notes render as a clamped line
   * at the chart boundary. Hide only when more than 12 semitones (1 octave)
   * outside the range — matching the DoReMi tolerance.
   */
  if (midi < midiMin.value - 12 || midi > midiMax.value + 12) return null

  return midi
})

const chartCurrentFrequency = computed(() => {
  if (isListening.value) {
    if (isDeaf.value) return null

    return currentFrequency.value ?? null
  }

  return props.overridePreviewFrequency ?? previewFrequency.value
})

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

const { fireConfetti } = useConfettiStore()

/* Use the chart's visible grid notes for sequence playback */
const rangeNotes = computed(() => {
  const notes = chartRef.value?.gridNotes ?? []

  return notes.map((n) => ({
    solfege: '',
    note: n.note,
    octave: n.octave,
  }))
})

const highlightedMidi = computed(() => {
  const idx = currentPlayingIndex.value
  const notes = chartRef.value?.gridNotes ?? []
  if (idx < 0 || idx >= notes.length) return null

  const n = notes[idx]
  const noteIndex = NOTE_NAMES.indexOf(n.note)

  return (n.octave + 1) * 12 + noteIndex
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))

const showSingHigherArrow = computed(
  () => tooLowMs.value >= TOO_LOW_OR_HIGH_HINT_MS,
)
const showSingLowerArrow = computed(
  () => tooHighMs.value >= TOO_LOW_OR_HIGH_HINT_MS,
)

watch(
  durationSec,
  (sec) => {
    setHoldDuration(sec * 1000)
  },
  { immediate: true },
)

watch(
  totalRounds,
  (n) => {
    setTotalRounds(n)
  },
  { immediate: true },
)

watch(
  rangeIndex,
  () => {
    const range = selectedRange.value
    setMidiRange(range.midiMin, range.midiMax)
  },
  { immediate: true },
)

watch(isComplete, (complete) => {
  if (complete) {
    fireConfetti()
  }
})

const chartRef = ref<InstanceType<typeof SingToneChart> | null>(null)

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

function toggleSequence() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    triggerIdleDeafPeriod()
    playSequence(rangeNotes.value)
  }
}

function handleTonePlayed() {
  triggerDeafPeriod()
  triggerIdleDeafPeriod()
}

/* Re-arm the deaf window when the sequence finishes so the preview doesn't
 * flash immediately after the last note — the 1000ms timer started at
 * sequence-begin has already expired by the time the sequence ends. */
watch(isPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    triggerIdleDeafPeriod()
  }
})

/* The game auto-plays the target tone at round start and on each advance.
 * Re-arm the idle preview's deaf window so the mic doesn't catch the
 * target tone's tail and flash the orange preview line. */
watch(targetTonePlayCount, () => {
  triggerIdleDeafPeriod()
})

/* Scroll to page bottom when gameplay starts */
watch(gameState, (state) => {
  if (state !== 'playing') return

  setTimeout(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
  }, 0)
})

onUnmounted(() => {
  stopSequence()
  stop()
})
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="sing-tone-game-display"
    :data-state="gameState"
  >
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>🎯</span>
      <span>{{ t('singTone.title') }}</span>
    </h1>
    <p
      v-show="gameState !== 'complete'"
      class="text-sm text-(--p-text-muted-color) sm:mb-4"
    >
      {{ t('singTone.subtitle') }}
    </p>
    <p
      v-if="gameState === 'idle'"
      class="text-sm text-(--p-text-muted-color) md:hidden"
    >
      {{
        t('singTone.settingsSummary', {
          rounds: totalRounds,
          holdDuration: durationSec,
        })
      }}
    </p>

    <slot />

    <!-- State: idle -->
    <div
      v-if="gameState === 'idle'"
      class="flex w-full flex-col items-center gap-4 sm:mb-4"
    >
      <SingToneSettingsRow
        v-model:rangeIndex="rangeIndex"
        v-model:durationSec="durationSec"
        v-model:totalRounds="totalRounds"
      />

      <div class="flex w-full flex-wrap items-center justify-center gap-2">
        <PrimeButton
          class="min-w-20"
          severity="success"
          size="small"
          rounded
          @click="handleStart"
        >
          {{ t('singTone.play') }}
        </PrimeButton>

        <PrimeButton
          class="min-w-20"
          :class="{ 'toggle-sequence-idle': !isPlayingSequence }"
          :severity="isPlayingSequence ? 'warn' : 'secondary'"
          size="small"
          rounded
          @click="toggleSequence"
        >
          {{
            isPlayingSequence
              ? t('generic.muteButton')
              : t('generic.previewButton')
          }}
        </PrimeButton>

        <PreviewToggle
          v-model="isPreviewEnabled"
          :disabled="micPermission === 'denied'"
        />

        <ToggleIconButton
          v-model="showSingToneTarget"
          iconOn="pi pi-eye"
          iconOff="pi pi-eye-slash"
          :label="t('generic.showNoteTarget')"
        />
      </div>

      <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>
    </div>

    <!-- State: playing -->
    <div
      v-else-if="gameState === 'playing'"
      class="flex flex-col items-center gap-2 sm:mb-4"
    >
      <div class="pt-4"></div>
      <PrimeButton
        class="min-w-20"
        severity="danger"
        size="small"
        rounded
        @click="handleStop"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <div class="flex items-center gap-4">
        <p
          class="min-w-20 text-end font-mono text-lg text-(--p-text-muted-color) tabular-nums"
        >
          ⏱ {{ elapsedSeconds }}s
        </p>
        <PrimeTag severity="secondary" rounded
          >{{ completedCount }}/{{ gameTotalRounds }}</PrimeTag
        >
      </div>
    </div>

    <!-- State: complete -->
    <div
      v-else-if="gameState === 'complete'"
      class="mb-4 flex w-full flex-col items-center gap-4 sm:min-h-72"
    >
      <div class="text-6xl">🎉</div>
      <h2 class="text-3xl font-bold text-(--p-green-400)">
        {{ t('generic.congratulations') }}
      </h2>
      <div class="flex flex-col items-center gap-1">
        <p class="text-(--p-surface-400) dark:text-(--p-surface-300)">
          {{
            t('singTone.congratulationsMessage', {
              rounds: gameTotalRounds,
              seconds: elapsedSeconds,
              holdDuration: durationSec,
            })
          }}
        </p>
        <p class="text-(--p-surface-400) dark:text-(--p-surface-300)">
          {{ t(selectedRange.labelKey) }} ({{ selectedRange.noteRange }})
        </p>
      </div>
      <p class="text-lg text-(--p-text-muted-color)">
        {{ t('doReMi.time') }}
        <span class="font-mono text-(--p-text-color)"
          >{{ elapsedSeconds }}s</span
        >
      </p>
      <PrimeButton
        severity="success"
        size="small"
        rounded
        @click="handleReset"
        class="min-w-20"
      >
        {{ t('generic.playAgain') }}
      </PrimeButton>
    </div>

    <!-- Static target note chart -->
    <SingToneChart
      v-if="gameState !== 'complete'"
      ref="chartRef"
      :targetMidi="targetMidi"
      :currentMidi="chartCurrentMidi"
      :currentFrequency="chartCurrentFrequency"
      :midiMin="midiMin"
      :midiMax="midiMax"
      :isSingingCorrectNote="isSingingCorrectNote"
      :holdProgress="holdProgress"
      :highlightedMidi="highlightedMidi"
      :onTonePlayed="handleTonePlayed"
      :showOverlay="
        gameState === 'playing' && showSingToneTarget && !!targetNoteLabel
      "
      :overlayTargetNoteLabel="targetNoteLabel"
      :overlayCentsFromTarget="centsFromTarget"
      :overlayTargetFrequency="targetFrequency"
      :overlayCurrentFrequency="currentFrequency"
      :overlayShowSingHigherArrow="showSingHigherArrow"
      :overlayShowSingLowerArrow="showSingLowerArrow"
    />
  </div>
</template>

<style scoped lang="css">
.toggle-sequence-idle {
  padding-block: 0;
  font-size: 1.2rem;
}
</style>

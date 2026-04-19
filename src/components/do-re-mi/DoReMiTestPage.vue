<script setup lang="ts">
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_SCALE_MODE,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  SCALE_MODE_OPTIONS,
  START_TONE_OPTIONS,
} from '@/composables/useDoReMiGame'
import type { ToneMode } from '@/composables/toneEngine'
import type { NoteName, ScaleMode } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'

const { t } = useI18n()

const holdDurationOptions = [0.1, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 10]

const defaultDurationSec = DEFAULT_HOLD_DURATION_MS / 1000
const selectedDurationSec = ref(defaultDurationSec)

const { toneMode, setToneMode } = useTonePlayer()
const selectedToneMode = ref<ToneMode>(toneMode.value)

const selectedStartOffset = ref(DEFAULT_STARTING_SEMITONE_OFFSET)
const selectedScaleMode = ref<ScaleMode>(DEFAULT_SCALE_MODE)

const selectedNote = ref<NoteName>('G')
const selectedOctave = ref(3)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

const simulatedPitch = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

const {
  scaleSteps,
  currentStepIndex,
  targetStep,
  targetFrequency,
  currentFrequency,
  centsFromTarget,
  holdProgress,
  tooLowMs,
  tooHighMs,
  elapsedMs,
  isComplete,
  isSingingCorrectNote,
  isListening,
  error,
  start,
  stop,
  reset,
  setHoldDuration,
  setStartingSemitoneOffset,
  setScaleMode,
} = useDoReMiGame({ pitchDetection: simulatedPitch })

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const { fireConfetti } = useConfettiStore()

type GameState = 'idle' | 'playing' | 'complete'

const gameState = computed<GameState>(() => {
  if (isComplete.value) return 'complete'
  if (isListening.value) return 'playing'
  return 'idle'
})

const elapsedSeconds = computed(() => (elapsedMs.value / 1000).toFixed(1))

const selectedScaleModeLabel = computed(
  () =>
    SCALE_MODE_OPTIONS.find((o) => o.id === selectedScaleMode.value)?.label ??
    selectedScaleMode.value,
)

watch(
  selectedDurationSec,
  (sec) => {
    setHoldDuration(sec * 1000)
  },
  { immediate: true },
)

watch(
  selectedToneMode,
  (mode) => {
    setToneMode(mode)
  },
  { immediate: true },
)

watch(
  selectedStartOffset,
  (offset) => {
    setStartingSemitoneOffset(offset)
  },
  { immediate: true },
)

watch(
  selectedScaleMode,
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
}

function handleStop() {
  stopSequence()
  stop()
}

function handleReset() {
  stopSequence()
  reset()
}

function toggleDoReMi() {
  if (isPlayingSequence.value) {
    stopSequence()
  } else {
    playSequence(scaleSteps.value)
  }
}

function matchTarget() {
  const step = targetStep.value
  if (!step) return

  selectedNote.value = step.note
  selectedOctave.value = step.octave
  selectedCents.value = 0
}

onUnmounted(() => {
  stopSequence()
  stop()
})
</script>

<template>
  <div class="flex grow flex-col items-center gap-4">
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>🎶</span>
      <span> {{ t('doReMi.title') }} (Test)</span>
    </h1>
    <p class="text-sm text-gray-400 sm:mb-4">
      {{ t('doReMi.singNoteFor', { seconds: selectedDurationSec }) }}
    </p>

    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-gray-800/50 p-4"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Note</label>
        <Select v-model="selectedNote" class="min-w-20">
          <option v-for="note in NOTE_NAMES" :key="note" :value="note">
            {{ note }}
          </option>
        </Select>
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-gray-400">Octave</label>
        <Select v-model.number="selectedOctave" class="min-w-16">
          <option v-for="oct in [2, 3, 4, 5, 6]" :key="oct" :value="oct">
            {{ oct }}
          </option>
        </Select>
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-gray-400">
          Cents: {{ selectedCents > 0 ? '+' : '' }}{{ selectedCents }}
        </label>
        <input
          v-model.number="selectedCents"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full"
        />
      </div>

      <div class="flex min-w-32 flex-col gap-1">
        <label class="text-xs text-gray-400">
          Clarity: {{ Math.round(selectedClarity * 100) }}%
        </label>
        <input
          v-model.number="selectedClarity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full"
        />
      </div>

      <div class="flex min-w-28 flex-col gap-1">
        <label class="text-xs text-gray-400">
          Jitter: ±{{ selectedJitter }}¢
        </label>
        <input
          v-model.number="selectedJitter"
          type="range"
          min="0"
          max="20"
          step="1"
          class="w-full"
        />
      </div>

      <Button
        v-if="gameState === 'playing'"
        variant="purple"
        class="text-sm"
        @click="matchTarget"
      >
        Match target
      </Button>
    </div>

    <!-- State: 1 -->
    <div
      v-if="gameState === 'idle'"
      class="flex w-full flex-col items-center gap-4 sm:mb-4"
    >
      <div
        class="flex flex-wrap items-center gap-4 sm:mb-4 md:grid md:grid-cols-[auto_1fr_auto_1fr]"
      >
        <div
          class="flex items-center gap-2 md:col-span-2 md:grid md:grid-cols-subgrid md:items-center"
        >
          <label class="hidden text-sm text-gray-400 md:block">{{
            t('doReMi.startTone')
          }}</label>
          <Select v-model.number="selectedStartOffset">
            <option
              v-for="option in START_TONE_OPTIONS"
              :key="option.offset"
              :value="option.offset"
            >
              {{ option.label }}
            </option>
          </Select>
        </div>

        <div
          class="flex items-center gap-2 md:col-span-2 md:grid md:grid-cols-subgrid md:items-center"
        >
          <label class="hidden text-end text-sm text-gray-400 md:block">{{
            t('doReMi.scaleMode')
          }}</label>
          <Select v-model="selectedScaleMode">
            <option
              v-for="option in SCALE_MODE_OPTIONS"
              :key="option.id"
              :value="option.id"
            >
              {{ option.label }}
            </option>
          </Select>
        </div>

        <div
          class="flex items-center gap-2 md:col-span-2 md:grid md:grid-cols-subgrid md:items-center"
        >
          <label class="hidden text-sm text-gray-400 md:block">{{
            t('doReMi.holdDuration')
          }}</label>
          <Select v-model.number="selectedDurationSec">
            <option v-for="sec in holdDurationOptions" :key="sec" :value="sec">
              {{ sec }}s
            </option>
          </Select>
        </div>

        <div
          class="hidden items-center gap-2 min-[500px]:flex md:col-span-2 md:grid md:grid-cols-subgrid md:items-center"
        >
          <label
            class="hidden text-end text-sm text-gray-400 md:block md:min-w-22.5"
            >{{ t('sounds.toneSound') }}</label
          >
          <ToneModeSelect v-model="selectedToneMode" />
        </div>
      </div>

      <div class="flex w-full flex-wrap items-center justify-center gap-4">
        <Button class="w-full max-w-35" @click="handleStart">
          {{ t('generic.start') }}
        </Button>

        <Button
          class="w-full max-w-35"
          :variant="isPlayingSequence ? 'yellow' : 'purple'"
          @click="toggleDoReMi"
        >
          {{
            isPlayingSequence
              ? t('doReMi.muteButton')
              : t('doReMi.doReMiButton')
          }}
        </Button>
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- State: 2 -->
    <div
      v-else-if="gameState === 'playing'"
      class="flex flex-col items-center gap-2 sm:mb-4"
    >
      <Button class="w-full max-w-35" variant="red" @click="handleStop">
        {{ t('generic.stop') }}
      </Button>
      <p class="min-w-20 text-end font-mono text-lg text-gray-400 tabular-nums">
        ⏱ {{ elapsedSeconds }}s
      </p>

      <DoReMiNoteTarget
        :targetStep="targetStep"
        :targetFrequency="targetFrequency"
        :currentFrequency="currentFrequency"
        :centsFromTarget="centsFromTarget"
        :isSingingCorrectNote="isSingingCorrectNote"
        :tooLowMs="tooLowMs"
        :tooHighMs="tooHighMs"
      />
    </div>

    <!-- State: 3 -->
    <div
      v-else-if="gameState === 'complete'"
      class="mb-4 flex w-full flex-col items-center gap-4 sm:min-h-72"
    >
      <div class="text-6xl">🎉</div>
      <h2 class="text-3xl font-bold text-green-400">
        {{ t('doReMi.congratulations') }}
      </h2>
      <p class="text-gray-300">
        {{
          t('doReMi.congratulationsMessage', {
            seconds: selectedDurationSec,
            mode: selectedScaleModeLabel,
          })
        }}
      </p>
      <p class="text-lg text-gray-400">
        {{ t('doReMi.time') }}
        <span class="font-mono text-white">{{ elapsedSeconds }}s</span>
      </p>
      <Button @click="handleReset">
        {{ t('doReMi.playAgain') }}
      </Button>
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
    />
  </div>
</template>

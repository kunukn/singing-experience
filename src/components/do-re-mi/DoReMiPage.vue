<script setup lang="ts">
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  START_TONE_OPTIONS,
} from '@/composables/useDoReMiGame'
import type { ToneMode } from '@/composables/useTonePlayer'

const { t } = useI18n()

const holdDurationOptions = [0.1, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 10]
const selectedDurationSec = ref(DEFAULT_HOLD_DURATION_MS / 1000)

const { toneMode, setToneMode } = useTonePlayer()
const selectedToneMode = ref<ToneMode>(toneMode.value)

const selectedStartOffset = ref(DEFAULT_STARTING_SEMITONE_OFFSET)

const {
  scaleSteps,
  currentStepIndex,
  targetStep,
  targetFrequency,
  currentFrequency,
  centsFromTarget,
  holdProgress,
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
} = useDoReMiGame()

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

watch(selectedDurationSec, (sec) => {
  setHoldDuration(sec * 1000)
})

watch(selectedToneMode, (mode) => {
  setToneMode(mode)
})

watch(selectedStartOffset, (offset) => {
  setStartingSemitoneOffset(offset)
})

watch(isComplete, (complete) => {
  if (complete) {
    fireConfetti()
    // playSequence(scaleSteps.value, 90)
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

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex grow flex-col items-center gap-4">
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>🎶</span>
      <span> {{ t('doReMi.title') }}</span>
    </h1>
    <p class="text-sm text-gray-400 sm:mb-4">
      {{ t('doReMi.singNoteFor', { seconds: selectedDurationSec }) }}
    </p>

    <!-- State: 1 -->
    <div
      v-if="gameState === 'idle'"
      class="flex w-full flex-col items-center gap-4 sm:mb-4"
    >
      <div class="flex flex-wrap items-center gap-4 sm:mb-4">
        <div class="flex items-center gap-2">
          <label class="hidden text-sm text-gray-400 md:block">{{
            t('doReMi.startTone')
          }}</label>
          <BasicSelect v-model.number="selectedStartOffset">
            <option
              v-for="option in START_TONE_OPTIONS"
              :key="option.offset"
              :value="option.offset"
            >
              {{ option.label }}
            </option>
          </BasicSelect>
        </div>

        <div class="flex items-center gap-2">
          <label class="hidden text-sm text-gray-400 md:block">{{
            t('doReMi.holdDuration')
          }}</label>
          <BasicSelect v-model.number="selectedDurationSec">
            <option v-for="sec in holdDurationOptions" :key="sec" :value="sec">
              {{ sec }}s
            </option>
          </BasicSelect>
        </div>

        <div class="flex items-center gap-2">
          <label class="hidden text-sm text-gray-400 md:block">{{
            t('sounds.toneSound')
          }}</label>
          <ToneModeSelect v-model="selectedToneMode" />
        </div>
      </div>

      <div class="flex w-full flex-wrap items-center justify-center gap-4">
        <BasicButton class="w-full max-w-35" @click="handleStart">
          {{ t('generic.start') }}
        </BasicButton>

        <BasicButton
          class="w-full max-w-35"
          :variant="isPlayingSequence ? 'yellow' : 'purple'"
          @click="toggleDoReMi"
        >
          {{
            isPlayingSequence
              ? t('doReMi.muteButton')
              : t('doReMi.doReMiButton')
          }}
        </BasicButton>
      </div>

      <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
    </div>

    <!-- State: 2 -->
    <div
      v-else-if="gameState === 'playing'"
      class="flex flex-col items-center gap-2 sm:mb-4"
    >
      <BasicButton class="w-full max-w-35" variant="red" @click="handleStop">
        {{ t('generic.stop') }}
      </BasicButton>
      <p
        class="min-w-20 text-right font-mono text-lg text-gray-400 tabular-nums"
      >
        ⏱ {{ elapsedSeconds }}s
      </p>

      <DoReMiNoteTarget
        :targetStep="targetStep"
        :targetFrequency="targetFrequency"
        :currentFrequency="currentFrequency"
        :centsFromTarget="centsFromTarget"
        :isSingingCorrectNote="isSingingCorrectNote"
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
          t('doReMi.congratulationsMessage', { seconds: selectedDurationSec })
        }}
      </p>
      <p class="text-lg text-gray-400">
        {{ t('doReMi.time') }}
        <span class="font-mono text-white">{{ elapsedSeconds }}s</span>
      </p>
      <BasicButton @click="handleReset">
        {{ t('doReMi.playAgain') }}
      </BasicButton>
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

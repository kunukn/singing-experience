<script setup lang="ts">
import {
  SCALE_MODE_OPTIONS,
  START_TONE_OPTIONS,
} from '@/composables/useDoReMiGame'
import type { DoReMiGameResult } from '@/composables/useDoReMiGame'
import type { ToneMode } from '@/composables/toneEngine'
import type { ScaleMode } from '@/utils/noteUtils'

type Props = {
  game: DoReMiGameResult
  titleSuffix?: string
}

const props = defineProps<Props>()

const durationSec = defineModel<number>('durationSec', { required: true })
const startOffset = defineModel<number>('startOffset', { required: true })
const scaleMode = defineModel<ScaleMode>('scaleMode', { required: true })
const toneMode = defineModel<ToneMode>('toneMode', { required: true })

const { t } = useI18n()

const holdDurationOptions = [0.1, 0.3, 0.5, 1, 2, 3, 4, 5, 6, 7, 10]

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
} = props.game

const { isPlayingSequence, currentPlayingIndex, playSequence, stopSequence } =
  useDoReMiPlaySequence()

const { setToneMode } = useTonePlayer()

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
    SCALE_MODE_OPTIONS.find((o) => o.id === scaleMode.value)?.label ??
    scaleMode.value,
)

watch(
  durationSec,
  (sec) => {
    setHoldDuration(sec * 1000)
  },
  { immediate: true },
)

watch(
  toneMode,
  (mode) => {
    setToneMode(mode)
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
  stopSequence()
  stop()
})
</script>

<template>
  <div class="flex grow flex-col items-center gap-4">
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>🎶</span>
      <span>
        {{ t('doReMi.title') }}{{ titleSuffix ? ` ${titleSuffix}` : '' }}
      </span>
    </h1>
    <p class="text-sm text-gray-400 sm:mb-4">
      {{ t('doReMi.singNoteFor', { seconds: durationSec }) }}
    </p>

    <slot :gameState="gameState" :targetStep="targetStep" />

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
          <Select v-model.number="startOffset">
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
          <Select v-model="scaleMode">
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
          <Select v-model.number="durationSec">
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
          <ToneModeSelect v-model="toneMode" />
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
            seconds: durationSec,
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

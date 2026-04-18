<script setup lang="ts">
import type { ScaleStep } from '@/composables/useDoReMiGame'
import { TONE_CLICK_HIGHLIGHT_DURATION_MS } from '@/constants/toneConstants'
import { noteToFrequency } from '@/utils/noteUtils'
import DoReMiScaleItem from './DoReMiScaleItem.vue'

type Props = {
  scaleSteps: ScaleStep[]
  currentStepIndex: number
  holdProgress: number
  isComplete: boolean
  isStarted: boolean
  isPlayingSequence?: boolean
  currentPlayingIndex?: number
}

const props = withDefaults(defineProps<Props>(), {
  isPlayingSequence: false,
  currentPlayingIndex: -1,
})

const { t } = useI18n()
const { playTone } = useTonePlayer()

const reversedSteps = computed(() =>
  props.scaleSteps.map((step, i) => ({ step, originalIndex: i })).toReversed(),
)

const scrollAnchor = ref<HTMLElement | null>(null)
const stepElements = ref<HTMLElement[]>([])
const clickedIndex = ref<number | null>(null)
let clickedTimer: ReturnType<typeof setTimeout> | null = null

function handleStepClick(index: number, step: ScaleStep) {
  playTone(noteToFrequency(step.note, step.octave))

  if (clickedTimer) clearTimeout(clickedTimer)
  clickedIndex.value = index
  clickedTimer = setTimeout(() => {
    clickedIndex.value = null
    clickedTimer = null
  }, TONE_CLICK_HIGHLIGHT_DURATION_MS)
}

onUnmounted(() => {
  if (clickedTimer) clearTimeout(clickedTimer)
})

watch(
  () => props.currentStepIndex,
  (index) => {
    nextTick(() => {
      stepElements.value[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    })
  },
)

watch(
  () => props.isStarted,
  (started) => {
    if (!started) return

    nextTick(() => {
      scrollAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    })
  },
)

function stepStatus(
  index: number,
  currentStepIndex: number,
): 'completed' | 'current' | 'upcoming' {
  if (index < currentStepIndex) return 'completed'
  if (index === currentStepIndex) return 'current'

  return 'upcoming'
}

function isStepHighlighted(index: number): boolean {
  return (
    (props.isPlayingSequence && props.currentPlayingIndex === index) ||
    clickedIndex.value === index
  )
}
</script>

<template>
  <div class="flex w-full max-w-150 flex-col gap-2 sm:gap-3">
    <DoReMiScaleItem
      v-for="{ step, originalIndex } in reversedSteps"
      :ref="
        (el) => {
          if (el)
            stepElements[originalIndex] = (
              el as InstanceType<typeof DoReMiScaleItem>
            ).$el
        }
      "
      :key="originalIndex"
      :data-testid="'scale-step-' + originalIndex"
      :step="step"
      :status="stepStatus(originalIndex, currentStepIndex)"
      :isComplete="isComplete"
      :isStarted="isStarted"
      :isHighlighted="isStepHighlighted(originalIndex)"
      :holdProgress="holdProgress"
      :buttonTitle="t('doReMi.playSolfege', { solfege: step.solfege })"
      @click="handleStepClick(originalIndex, step)"
    />
  </div>
  <div id="scroll-anchor" ref="scrollAnchor" class="py-2"></div>
</template>

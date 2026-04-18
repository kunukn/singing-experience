<script setup lang="ts">
import type { ScaleStep } from '@/composables/useDoReMiGame'

type StepStatus = 'completed' | 'current' | 'upcoming'

type Props = {
  step: ScaleStep
  status: StepStatus
  isComplete: boolean
  isStarted: boolean
  isHighlighted: boolean
  holdProgress: number
  buttonTitle: string
}

const props = defineProps<Props>()
const emit = defineEmits<{ click: [] }>()

const progressWidth = computed(() => {
  if (
    props.status === 'completed' ||
    (props.status === 'current' && props.isComplete)
  ) {
    return '100%'
  }
  if (props.status === 'current') {
    return `${props.holdProgress * 100}%`
  }

  return '0%'
})

const isCompletedOrDone = computed(
  () =>
    props.status === 'completed' ||
    (props.status === 'current' && props.isComplete),
)
</script>

<template>
  <div
    class="flex items-center gap-3 rounded-lg px-4 py-1 transition-[border-color,border-opacity] duration-200 sm:py-2"
    :class="{
      'border border-green-700 bg-green-900/40': status === 'completed',
      'border border-green-500 bg-green-900/40 shadow-lg shadow-green-500/10':
        status === 'current' && isComplete,
      'border border-gray-800 bg-gray-900/50':
        (status === 'upcoming' || status === 'current') && !isComplete,
    }"
  >
    <!-- Solfège label -->
    <button
      class="w-10 cursor-pointer rounded-sm border text-center text-lg font-bold transition-[border-color,color] duration-100 hover:border-white hover:text-white"
      :class="{
        'scale-110 border-purple-500 text-purple-400': isHighlighted,
        'border-green-700 text-green-400':
          !isHighlighted && status === 'completed',
        'border-green-500 text-green-400':
          !isHighlighted && status === 'current' && isComplete,
        'border-green-500 text-white':
          !isHighlighted && status === 'current' && !isComplete && isStarted,
        'border-gray-800 text-gray-600':
          !isHighlighted &&
          (status === 'upcoming' || (status === 'current' && !isStarted)),
      }"
      :title="buttonTitle"
      @click="emit('click')"
    >
      {{ step.solfege }}
    </button>

    <!-- Note name -->
    <span
      class="w-8 text-sm"
      :class="{
        'text-green-500': isCompletedOrDone,
        'text-gray-300': status === 'current' && !isComplete && isStarted,
        'text-gray-700':
          status === 'upcoming' || (status === 'current' && !isStarted),
      }"
    >
      {{ step.note }}{{ step.octave }}
    </span>

    <!-- Progress bar -->
    <div class="h-2 flex-1 overflow-hidden rounded-full bg-gray-700">
      <div
        class="h-full rounded-full transition-all duration-100"
        :class="{
          'bg-green-500': isCompletedOrDone,
          'bg-green-400': status === 'current' && !isComplete,
          'bg-gray-700': status === 'upcoming',
        }"
        :style="{ width: progressWidth }"
      />
    </div>

    <!-- Status icon -->
    <span class="w-6 text-center">
      <span v-if="isCompletedOrDone" class="text-green-400">✓</span>
      <span
        v-else-if="status === 'current' && isStarted"
        class="animate-pulse text-green-400"
      >
        ●
      </span>
      <span v-else class="text-gray-700">○</span>
    </span>
  </div>
</template>

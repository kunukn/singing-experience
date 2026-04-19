<script setup lang="ts">
import { cleanColor, directionalColor } from '@/utils/pitchColors'

type Props = {
  cents: number | null
  threshold?: number
  maxRange?: number
  isVisible?: boolean
  highLabel?: string
  lowLabel?: string
  colorMode?: 'tuning' | 'directional'
}

const props = withDefaults(defineProps<Props>(), {
  threshold: 10,
  maxRange: 50,
  isVisible: true,
  highLabel: '',
  lowLabel: '',
  colorMode: 'tuning',
})

const indicatorColor = computed(() => {
  if (props.cents === null) return undefined

  return props.colorMode === 'directional'
    ? directionalColor(props.cents, props.threshold)
    : cleanColor(props.cents)
})

const indicatorTop = computed(() => {
  if (props.cents === null) return '50%'

  return `${Math.min(Math.max(50 - (props.cents / props.maxRange) * 50, 0), 100)}%`
})
</script>

<template>
  <div
    class="flex flex-col items-center gap-1"
    :class="{ invisible: !isVisible }"
  >
    <span class="text-xs text-gray-500">{{ highLabel }}</span>

    <div
      class="relative h-30 w-3 overflow-hidden rounded-full bg-gray-800 sm:h-40"
    >
      <!-- Center marker -->
      <div
        class="absolute start-0 top-1/2 z-10 h-0.5 w-full -translate-y-1/2 bg-gray-500"
      />
      <!-- Deviation indicator -->
      <div
        v-if="cents !== null"
        class="absolute start-0 h-2 w-full -translate-y-1/2 rounded-full transition-all duration-100"
        :style="{ top: indicatorTop, backgroundColor: indicatorColor }"
      />
    </div>

    <span class="text-xs text-gray-500">{{ lowLabel }}</span>
  </div>
</template>

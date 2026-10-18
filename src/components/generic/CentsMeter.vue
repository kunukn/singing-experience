<script setup lang="ts">
import { OFF_CENTS } from '@/utils/pitchColors'

const { cents } = defineProps<{
  /* null = no pitch; the track keeps its space so neighbours hold still */
  cents: number | null
}>()

const { colorForCents } = usePitchPreviewColor()

/* A pocket CentsDeviationBar, made to sit beside a CentsLabel: 0¢ on the
 * centre line, sharp rides up, flat down, and ±OFF_CENTS reaches the ends.
 * Sized in em, so it scales with the text beside it. */
const indicatorTop = computed(() => {
  if (cents === null) return '50%'

  const ratio = Math.min(Math.max(cents / OFF_CENTS, -1), 1)

  return `${50 - ratio * 50}%`
})
</script>

<template>
  <span
    class="relative block h-[1.4em] w-[0.28em] shrink-0 overflow-hidden rounded-full bg-(--p-surface-200) dark:bg-(--p-surface-700)"
    :class="{ invisible: cents === null }"
    aria-hidden="true"
    data-testid="cents-meter"
    :data-visible="cents !== null"
  >
    <span class="absolute start-0 top-1/2 h-px w-full bg-(--p-surface-400)" />
    <span
      class="absolute start-0 h-[0.14em] w-full -translate-y-1/2 transition-[top] duration-100 motion-reduce:transition-none"
      :style="{
        top: indicatorTop,
        backgroundColor: cents === null ? undefined : colorForCents(cents),
      }"
      data-testid="cents-meter-indicator"
    />
  </span>
</template>

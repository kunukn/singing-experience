<script setup lang="ts">
import type { SungState } from './useCircleOfFifthsGame'

const { sungState } = defineProps<{
  sungLabel: string | null
  /* null = nothing to compare against, shown in a neutral colour */
  sungState: SungState | null
  showTooLow: boolean
  showTooHigh: boolean
}>()

const { t } = useI18n()

/* Same colours as the too-low / too-high hint arrows beside it */
const SUNG_COLOR: Record<SungState, string> = {
  correct: 'text-(--p-green-500)',
  low: 'text-(--p-orange-400)',
  high: 'text-(--p-blue-400)',
}

const sungColor = computed(() =>
  sungState ? SUNG_COLOR[sungState] : 'text-(--p-text-muted-color)',
)
</script>

<template>
  <!-- 1fr | label | 1fr: the label sits on the centre line, with the 🎤 and
    the hint arrow either side, so nothing shifts as the label or the arrow
    changes -->
  <div
    class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-[0.6cqi] text-[3.6cqi] font-semibold tabular-nums transition-colors"
    :class="sungColor"
    data-testid="circle-target-sung"
    :data-state="sungState ?? 'none'"
    :title="t('circleOfFifths.youAreSinging')"
  >
    <span class="justify-self-end" aria-hidden="true">🎤</span>
    <!-- Fixed width, sized for the widest label (D♭5) -->
    <span class="w-[2em] text-center whitespace-nowrap">{{
      sungLabel ?? '–'
    }}</span>
    <div class="grid w-[4cqi] place-items-center justify-self-start">
      <span
        class="col-start-1 row-start-1"
        :class="
          showTooLow ? 'animate-bounce text-(--p-orange-400)' : 'invisible'
        "
        :aria-label="t('generic.tooLow')"
        data-testid="circle-target-too-low"
        :data-visible="showTooLow"
      >
        <ArrowUpIcon class="size-[3.6cqi]" />
      </span>
      <span
        class="col-start-1 row-start-1"
        :class="
          showTooHigh ? 'animate-bounce text-(--p-blue-400)' : 'invisible'
        "
        :aria-label="t('generic.tooHigh')"
        data-testid="circle-target-too-high"
        :data-visible="showTooHigh"
      >
        <ArrowUpIcon class="size-[3.6cqi] rotate-180" />
      </span>
    </div>
  </div>
</template>

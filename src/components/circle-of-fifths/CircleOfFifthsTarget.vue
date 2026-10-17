<script setup lang="ts">
import type { HopDirection, Solfege, SungState } from './useCircleOfFifthsGame'

const { sungState } = defineProps<{
  keyLabel: string
  solfege: Solfege
  noteLabel: string
  hopDirection: HopDirection | null
  sungLabel: string | null
  sungState: SungState | null
  isCorrect: boolean
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
  <div class="flex flex-col items-center leading-tight">
    <span class="text-[3.2cqi] text-(--p-text-muted-color)">{{
      keyLabel
    }}</span>
    <span
      class="text-[8cqi] font-bold transition-colors"
      :class="isCorrect ? 'text-(--p-green-400)' : 'text-(--p-text-color)'"
      data-testid="circle-target-solfege"
      >{{ solfege }}</span
    >
    <span
      class="text-[3.6cqi] text-(--p-text-muted-color) tabular-nums"
      data-testid="circle-target-note"
    >
      <span
        v-if="hopDirection"
        class="font-bold text-(--p-text-color)"
        data-testid="circle-target-hop"
        :data-direction="hopDirection"
        :title="
          hopDirection === 'up'
            ? t('circleOfFifths.hopUp')
            : t('circleOfFifths.hopDown')
        "
        >{{ hopDirection === 'up' ? '↑' : '↓' }}</span
      >
      {{ noteLabel }}
    </span>

    <!-- What the singer is on now; the hint arrow lives here, away from the
      hop arrow, so the two never read as one -->
    <!-- 1fr | label | 1fr: the label sits on the centre line under the target,
      with the 🎤 and the hint arrow either side, so nothing shifts as the
      label or the arrow changes -->
    <div
      class="mt-[0.8cqi] grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-[0.6cqi] text-[3.6cqi] font-semibold tabular-nums transition-colors"
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
  </div>
</template>

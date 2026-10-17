<script setup lang="ts">
import type { HopDirection, Solfege, SungState } from './useCircleOfFifthsGame'

defineProps<{
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
    <CircleOfFifthsSungNote
      class="mt-[0.8cqi]"
      :sungLabel="sungLabel"
      :sungState="sungState"
      :showTooLow="showTooLow"
      :showTooHigh="showTooHigh"
    />
  </div>
</template>

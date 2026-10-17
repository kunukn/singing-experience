<script setup lang="ts">
import type { HopDirection, Solfege } from './useCircleOfFifthsGame'

defineProps<{
  keyLabel: string
  solfege: Solfege
  noteLabel: string
  hopDirection: HopDirection | null
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
    <div class="flex items-center gap-1">
      <div class="grid w-[4cqi] place-items-center">
        <span
          class="col-start-1 row-start-1"
          :class="
            showTooLow ? 'animate-bounce text-(--p-orange-400)' : 'invisible'
          "
          :aria-label="t('generic.tooLow')"
        >
          <ArrowUpIcon class="size-[3.6cqi]" />
        </span>
        <span
          class="col-start-1 row-start-1"
          :class="
            showTooHigh ? 'animate-bounce text-(--p-blue-400)' : 'invisible'
          "
          :aria-label="t('generic.tooHigh')"
        >
          <ArrowUpIcon class="size-[3.6cqi] rotate-180" />
        </span>
      </div>
      <span class="text-[3.6cqi] text-(--p-text-muted-color) tabular-nums">
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
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  frequency: number | null
  clarity: number
  isListening: boolean
  /* Duet fits two readouts where one used to sit, so the units collapse onto
   * the numbers and "Clarity" drops away — the % sign already says it. */
  isCompact?: boolean
}

withDefaults(defineProps<Props>(), { isCompact: false })

const { t } = useI18n()
</script>

<template>
  <!-- Fixed width, right-aligned: the reading swings between "-" and four
       digits, and a block that resizes with it would shove the note beside it
       back and forth. The widest case ("1500 Hz", the detector's ceiling)
       measures 64 px, so 68 leaves a little slack for wider digit glyphs. -->
  <div
    v-if="isCompact"
    v-show="isListening"
    class="flex w-17 flex-col items-end whitespace-nowrap text-(--p-text-muted-color) tabular-nums"
  >
    <span>
      {{ frequency != null ? Math.round(frequency) : '-' }}
      <span class="text-(--p-surface-500)">{{ t('generic.hz') }}</span>
    </span>
    <span>{{ Math.round(clarity * 100) }}%</span>
  </div>

  <div
    v-else
    v-show="isListening"
    class="grid grid-cols-[auto_auto] items-center gap-x-1 text-(--p-text-muted-color) tabular-nums"
  >
    <span class="min-w-12 text-end tabular-nums">{{
      frequency != null ? Math.round(frequency) : '-'
    }}</span>
    <span class="text-(--p-surface-500)">{{ t('generic.hz') }}</span>

    <span class="text-end tabular-nums">{{ Math.round(clarity * 100) }}%</span>
    <span class="text-(--p-surface-500)">{{ t('pitchDetector.clarity') }}</span>
  </div>
</template>

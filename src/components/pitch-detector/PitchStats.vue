<script setup lang="ts">
type Props = {
  frequency: number | null
  clarity: number
  isListening: boolean
}

defineProps<Props>()

const { t } = useI18n()
</script>

<template>
  <div
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

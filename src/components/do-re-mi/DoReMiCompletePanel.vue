<script setup lang="ts">
type Props = {
  durationSec: number
  elapsedSeconds: string
  selectedScaleModeLabel: string
  startToneLabel: string
}

defineProps<Props>()

const emit = defineEmits<{
  reset: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-4 sm:mb-4">
    <h2 class="text-3xl font-bold text-(--p-green-400)">
      {{ t('generic.congratulations') }}
    </h2>
    <p class="text-(--p-surface-400) dark:text-(--p-surface-300)">
      {{
        t('doReMi.congratulationsMessage', {
          seconds: durationSec,
          mode: selectedScaleModeLabel,
          startTone: startToneLabel,
        })
      }}
    </p>
    <div class="flex items-center gap-4">
      <p class="text-lg text-(--p-text-muted-color)">
        {{ t('doReMi.time') }}
        <span class="text-(--p-text-color) tabular-nums"
          >{{ elapsedSeconds }}s</span
        >
      </p>
      <PrimeButton
        class="min-w-20"
        severity="success"
        size="small"
        rounded
        @click="emit('reset')"
      >
        {{ t('generic.playAgain') }}
      </PrimeButton>
    </div>
  </div>
</template>

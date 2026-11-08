<script setup lang="ts">
import type { RecordResult } from '@/stores/useHighScoreStore'

type Props = {
  durationSec: number
  elapsedSeconds: string
  selectedScaleModeLabel: string
  startToneLabel: string
  recordResult: RecordResult | null
}

defineProps<Props>()

const emit = defineEmits<{
  playAgain: []
  settings: []
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
    <p class="text-lg text-(--p-text-muted-color)">
      {{ t('doReMi.time') }}
      <span class="text-(--p-text-color) tabular-nums"
        >{{ elapsedSeconds }}s</span
      >
    </p>
    <HighScoreBadge :result="recordResult" />
    <GameEndActions
      @playAgain="emit('playAgain')"
      @settings="emit('settings')"
    />
  </div>
</template>

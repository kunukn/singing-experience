<script setup lang="ts">
import type { GameSummary } from './useSingFly'

type Props = {
  summary: GameSummary
  elapsedSeconds: string
  micPermission: PermissionState | null
}

defineProps<Props>()

const emit = defineEmits<{
  reset: []
}>()

const isPreviewEnabled = defineModel<boolean>('isPreviewEnabled', {
  required: true,
})
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2">
    <div class="flex flex-wrap items-baseline justify-center gap-2">
      <h2 class="text-2xl font-bold text-(--p-green-400)">
        {{
          summary.score === summary.totalTargets
            ? $t('generic.congratulations')
            : $t('generic.gameOver')
        }}
      </h2>
    </div>

    <div
      class="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-center text-base"
    >
      <p class="flex items-baseline gap-1 text-(--p-text-muted-color)">
        <span>{{ $t('generic.score') }} </span>
        <span class="text-(--p-text-color) tabular-nums">
          {{ summary.score }} / {{ summary.totalTargets }}
        </span>
      </p>
      <p class="flex items-baseline gap-1 text-(--p-text-muted-color)">
        <span>{{ $t('generic.time') }} </span>
        <span class="text-(--p-text-color) tabular-nums">
          {{ elapsedSeconds }}s / {{ summary.durationMs / 1000 }}s
        </span>
      </p>
    </div>
    <p class="mb-2 text-center text-sm text-(--p-text-muted-color)">
      <span class="text-(--p-text-color) tabular-nums">
        {{ $t(`generic.difficulty_${summary.difficulty}`) }} ·
        {{ $t(summary.voiceRangeLabelKey) }} ({{ summary.voiceRangeNoteRange }})
      </span>
    </p>

    <div class="flex w-full flex-wrap items-center justify-center gap-2">
      <PrimeButton
        class="min-w-20"
        severity="success"
        size="small"
        rounded
        @click="emit('reset')"
      >
        {{ $t('generic.playAgain') }}
      </PrimeButton>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
type Props = {
  score: number
  totalTargets: number
  durationSec: number
  elapsedSeconds: string
  voiceRangeLabel: string
  voiceRangeNoteRange: string
}

defineProps<Props>()

const emit = defineEmits<{
  reset: []
}>()
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2">
    <div class="flex flex-wrap items-baseline justify-center gap-2">
      <div class="text-4xl">🎯</div>
      <h2 class="text-2xl font-bold text-(--p-green-400)">
        {{
          score >= 1 ? $t('generic.congratulations') : $t('generic.gameOver')
        }}
      </h2>
    </div>

    <div
      class="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-center text-base"
    >
      <p class="flex items-baseline gap-1 text-(--p-text-muted-color)">
        <span>{{ $t('generic.score') }} </span>
        <span class="text-(--p-text-color) tabular-nums">
          {{ score }} / {{ totalTargets }}
        </span>
      </p>
      <p class="flex items-baseline gap-1 text-(--p-text-muted-color)">
        <span>{{ $t('generic.time') }} </span>
        <span class="text-(--p-text-color) tabular-nums">
          {{ elapsedSeconds }}s / {{ durationSec }}s
        </span>
      </p>
    </div>
    <p class="text-center text-sm text-(--p-text-muted-color)">
      <span class="text-(--p-text-color) tabular-nums">
        {{ voiceRangeLabel }} ({{ voiceRangeNoteRange }})
      </span>
    </p>

    <PrimeButton
      class="min-w-24"
      severity="success"
      size="small"
      rounded
      @click="emit('reset')"
    >
      {{ $t('generic.playAgain') }}
    </PrimeButton>
  </div>
</template>

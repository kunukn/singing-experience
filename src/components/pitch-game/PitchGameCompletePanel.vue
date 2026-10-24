<script setup lang="ts">
import type { GameSummary } from './usePitchGame'

type Props = {
  score: number
  totalTargets: number
  durationSec: number
  elapsedSeconds: string
  voiceRangeLabel: string
  voiceRangeNoteRange: string
  endReason: GameSummary['endReason']
}

const props = defineProps<Props>()

const emit = defineEmits<{
  playAgain: []
  settings: []
}>()

/* Same condition as the confetti in PitchGameDisplay — the heading matches the
 * celebration, so a manual Stop reads "Game over" even with hits. */
const isCelebrated = computed(
  () => props.score >= 1 && props.endReason === 'natural',
)
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2">
    <div class="flex flex-wrap items-baseline justify-center gap-2">
      <ProgramPitchGameIcon class="size-10 self-center" />
      <h2 class="text-2xl font-bold text-(--p-green-400)">
        {{
          isCelebrated ? $t('generic.congratulations') : $t('generic.gameOver')
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

    <GameEndActions
      @playAgain="emit('playAgain')"
      @settings="emit('settings')"
    />
  </div>
</template>

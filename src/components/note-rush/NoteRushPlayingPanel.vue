<script setup lang="ts">
import { STREAK_CALLOUT_MIN } from './noteRushEffects'

type Props = {
  score: number
  /* Hits in a row since the last miss */
  streak: number
  totalTargets: number
  elapsedSeconds: number
}

defineProps<Props>()

const emit = defineEmits<{
  stop: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-col items-center gap-2">
    <PrimeButton
      class="min-w-20"
      severity="danger"
      size="small"
      rounded
      @click="emit('stop')"
    >
      {{ t('generic.stop') }}
    </PrimeButton>
    <p class="text-lg font-medium text-(--p-text-color)">
      {{ t('generic.score') }}
      <span class="font-mono tabular-nums"
        >{{ score }} / {{ totalTargets }}</span
      >
      <!-- Keyed on the run so the pop replays on every hit that extends it;
           invisible rather than removed below the callout, so the score does
           not shift sideways when it appears. -->
      <span
        :key="streak"
        class="streak-chip ms-2 inline-flex items-center gap-1 font-mono text-(--p-violet-400) tabular-nums"
        :class="streak >= STREAK_CALLOUT_MIN ? '' : 'invisible'"
        data-testid="note-rush-streak"
      >
        <i class="pi pi-bolt text-sm" aria-hidden="true" />×{{ streak }}
      </span>
    </p>
    <p
      class="min-w-20 text-end font-mono text-lg text-(--p-text-muted-color) tabular-nums"
    >
      ⏱ {{ elapsedSeconds }}s
    </p>
  </div>
</template>

<style scoped lang="css">
@media (prefers-reduced-motion: no-preference) {
  .streak-chip:not(.invisible) {
    animation: streak-pop 300ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
}

/* A quick swell to 1.35 and back each time the run grows. */
@keyframes streak-pop {
  0% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.35);
  }
  100% {
    transform: scale(1);
  }
}
</style>

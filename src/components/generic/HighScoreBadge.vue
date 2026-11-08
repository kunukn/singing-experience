<script setup lang="ts">
import type { RecordResult } from '@/stores/useHighScoreStore'
import { formatHighScore } from '@/utils/highScoreFormat'

/* The best score for the settings just played, shown on the end screen.
 * Muted: the target to beat. Highlighted, old → new: a record was just broken. */
const props = defineProps<{
  result: RecordResult | null
}>()

const { t, locale } = useI18n()

const best = computed(() => props.result?.best)
const previous = computed(() =>
  props.result?.isNewRecord ? props.result.previous : undefined,
)
</script>

<template>
  <div
    v-if="best"
    class="high-score-badge flex items-center justify-center gap-2 tabular-nums"
    :class="
      previous
        ? 'is-new-record font-semibold text-(--p-primary-color)'
        : 'text-sm text-(--p-text-muted-color)'
    "
    role="status"
    data-testid="high-score-badge"
    :data-new-record="previous !== undefined"
  >
    <i class="pi pi-trophy" aria-hidden="true" />
    <span class="sr-only">{{ t('records.title') }}</span>
    <template v-if="previous">
      <span>{{ t('records.newRecord') }}</span>
      <span class="text-(--p-text-muted-color)" data-testid="previous-best">
        {{ formatHighScore(previous, locale) }}
      </span>
      <i
        class="pi pi-arrow-right text-xs rtl:-scale-x-100"
        aria-hidden="true"
      />
    </template>
    <span data-testid="best">{{ formatHighScore(best, locale) }}</span>
  </div>
</template>

<style scoped lang="css">
@media (prefers-reduced-motion: no-preference) {
  .is-new-record {
    /* Starts after the end screen settles, so the eye lands on it last. */
    animation: high-score-pop 500ms cubic-bezier(0.34, 1.56, 0.64, 1) 300ms both;
  }
}

/* Overshoots to 1.15 before settling, a small "ta-da". */
@keyframes high-score-pop {
  0% {
    opacity: 0;
    transform: scale(0.6);
  }
  60% {
    opacity: 1;
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
  }
}
</style>

<script setup lang="ts">
import type { Difficulty } from '@/constants/difficulty'
import type { RecordResult } from '@/stores/useHighScoreStore'
import { useTransition } from '@vueuse/core'

import { STREAK_CALLOUT_MIN, starRating } from './noteRushEffects'
import type { GameSummary } from './useNoteRush'

type Props = {
  score: number
  totalTargets: number
  durationSec: number
  difficulty: Difficulty
  elapsedSeconds: string
  voiceRangeLabel: string
  voiceRangeNoteRange: string
  endReason: GameSummary['endReason']
  /* Longest run of hits in the round */
  bestStreak?: number
  recordResult?: RecordResult | null
}

const props = withDefaults(defineProps<Props>(), {
  bestStreak: 0,
  recordResult: null,
})

const emit = defineEmits<{
  playAgain: []
  settings: []
}>()

/* Same condition as the confetti in NoteRushDisplay — the heading matches the
 * celebration, so a manual Stop reads "Game over" even with hits. */
const isCelebrated = computed(
  () => props.score >= 1 && props.endReason === 'natural',
)

const STAR_COUNT = 3
/* ms — each star pops in this long after the one before it. */
const STAR_STAGGER_MS = 220

/* A manual Stop earns no stars, like it earns no confetti */
const stars = computed(() =>
  isCelebrated.value ? starRating(props.score, props.totalTargets) : 0,
)

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches

/* The score counts up from 0 as the stars land. Starts at the real score
 * under reduced motion, so nothing moves. */
const countedScore = ref(prefersReducedMotion ? props.score : 0)
const displayedScore = useTransition(countedScore, {
  duration: STAR_STAGGER_MS * STAR_COUNT,
  disabled: prefersReducedMotion,
})

onMounted(() => {
  countedScore.value = props.score
})
</script>

<template>
  <div class="flex w-full flex-col items-center gap-2">
    <h2 class="text-center text-2xl font-bold text-(--p-green-400)">
      {{
        isCelebrated ? $t('generic.congratulations') : $t('generic.gameOver')
      }}
    </h2>

    <!-- Decorative: the score beside it says the same in words. -->
    <div
      v-if="stars > 0"
      class="flex gap-1 text-2xl text-(--p-violet-400)"
      aria-hidden="true"
      data-testid="note-rush-stars"
      :data-stars="stars"
    >
      <i
        v-for="star in STAR_COUNT"
        :key="star"
        class="star pi"
        :class="star <= stars ? 'pi-star-fill is-earned' : 'pi-star opacity-40'"
        :style="{ animationDelay: `${(star - 1) * STAR_STAGGER_MS}ms` }"
      />
    </div>

    <div
      class="flex flex-wrap items-baseline justify-center gap-x-4 gap-y-1 text-center text-base"
    >
      <p class="flex items-baseline gap-1 text-(--p-text-muted-color)">
        <span>{{ $t('generic.score') }} </span>
        <span class="text-(--p-text-color) tabular-nums">
          {{ Math.round(displayedScore) }} / {{ totalTargets }}
        </span>
      </p>
      <p
        v-if="bestStreak >= STREAK_CALLOUT_MIN"
        class="flex items-baseline gap-1 text-(--p-violet-400) tabular-nums"
        data-testid="note-rush-best-streak"
      >
        <i class="pi pi-bolt text-sm" aria-hidden="true" />×{{ bestStreak }}
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
        <span data-testid="note-rush-difficulty">{{
          $t(`generic.difficulty_${difficulty}`)
        }}</span>
        · {{ voiceRangeLabel }} ({{ voiceRangeNoteRange }})
      </span>
    </p>

    <HighScoreBadge :result="recordResult" class="mb-2 md:mb-4" />

    <GameEndActions
      @playAgain="emit('playAgain')"
      @settings="emit('settings')"
    />
  </div>
</template>

<style scoped lang="css">
@media (prefers-reduced-motion: no-preference) {
  .star.is-earned {
    animation: star-pop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
}

/* Spins in from nothing and overshoots to 1.3 before settling. */
@keyframes star-pop {
  0% {
    opacity: 0;
    transform: scale(0) rotate(-45deg);
  }
  60% {
    opacity: 1;
    transform: scale(1.3) rotate(8deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
  }
}
</style>

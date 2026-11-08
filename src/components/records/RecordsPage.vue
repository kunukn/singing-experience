<script setup lang="ts">
import { games } from '@/constants/programs'
import { formatHighScore } from '@/utils/highScoreFormat'
import { useHighScoreLabels } from './useHighScoreLabels'

const { t, locale } = useI18n()
const highScores = useHighScoreStore()
const { describeConfig } = useHighScoreLabels()

const isConfirmingClear = ref(false)

/* One group per game, in catalogue order; newest first inside a game, so the
 * run just played sits at the top. */
const groups = computed(() =>
  games.flatMap((program) => {
    const scores = highScores.allScores
      .filter((score) => score.game === program.key)
      .toSorted((a, b) => b.achievedAt - a.achievedAt)

    return scores.length > 0 ? [{ program, scores }] : []
  }),
)

/* Month as a word, never all digits: 11/8/26 reads as 8 November in the US
 * and 11 August almost everywhere else. Intl still orders the parts per
 * language ("Nov 8, 2026", "8. nov. 2026", "2026年11月8日"). dateStyle
 * 'medium' isn't enough — German, Arabic and Japanese stay numeric. */
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
)

function clearScores() {
  highScores.clear()
  isConfirmingClear.value = false
}
</script>

<template>
  <div class="flex grow flex-col items-center pt-1 pb-4">
    <h1 class="product-title mb-4 flex items-center gap-2 font-bold">
      <i class="pi pi-trophy [--p-icon-size:1.75rem]" aria-hidden="true" />
      {{ t('records.title') }}
    </h1>

    <div
      v-if="groups.length === 0"
      class="flex flex-col items-center gap-4 pt-6"
      data-testid="records-empty"
    >
      <i
        class="pi pi-trophy text-(--p-text-muted-color) opacity-40 [--p-icon-size:4rem]"
        aria-hidden="true"
      />
      <PrimeButton
        as="router-link"
        to="/games"
        severity="success"
        size="small"
        rounded
        :label="t('home.programs.singingGames.name')"
      />
    </div>

    <div v-else class="flex w-full max-w-lg flex-col gap-6">
      <section
        v-for="group in groups"
        :key="group.program.key"
        :data-game="group.program.key"
        :aria-labelledby="`records-${group.program.key}`"
      >
        <h2
          :id="`records-${group.program.key}`"
          class="mb-2 flex items-center gap-2 text-lg font-semibold"
        >
          <component
            :is="group.program.icon"
            class="size-7 shrink-0"
            aria-hidden="true"
          />
          {{ t(`home.programs.${group.program.key}.name`) }}
        </h2>

        <ul class="flex flex-col gap-2">
          <li
            v-for="score in group.scores"
            :key="`${score.game}-${score.achievedAt}`"
            class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-(--p-content-border-color) bg-(--p-content-background) px-3 py-2"
            data-testid="record-entry"
          >
            <div class="flex flex-wrap gap-1">
              <PrimeTag
                v-for="label in describeConfig(score.config)"
                :key="label"
                :value="label"
                severity="secondary"
              />
            </div>
            <div class="ms-auto flex items-baseline gap-3 tabular-nums">
              <span class="font-semibold" data-testid="record-score">
                {{ formatHighScore(score, locale) }}
              </span>
              <span class="text-sm text-(--p-text-muted-color)">
                {{ dateFormat.format(score.achievedAt) }}
              </span>
            </div>
          </li>
        </ul>
      </section>

      <div class="flex flex-col items-center gap-2 pt-2">
        <template v-if="isConfirmingClear">
          <p class="text-sm text-(--p-text-muted-color)">
            {{ t('records.clearConfirm') }}
          </p>
          <div class="flex gap-2">
            <PrimeButton
              severity="secondary"
              text
              size="small"
              rounded
              :label="t('settings.resetCancel')"
              @click="isConfirmingClear = false"
            />
            <PrimeButton
              severity="danger"
              size="small"
              rounded
              icon="pi pi-trash"
              :label="t('generic.clear')"
              data-testid="records-clear-confirm"
              @click="clearScores"
            />
          </div>
        </template>
        <PrimeButton
          v-else
          severity="secondary"
          size="small"
          rounded
          icon="pi pi-trash"
          :label="t('generic.clear')"
          data-testid="records-clear"
          @click="isConfirmingClear = true"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
.product-title {
  font-size: clamp(1.5rem, 5cqi, 2.5rem);
}
</style>

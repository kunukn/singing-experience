<script setup lang="ts">
import { CLEAN_CENTS, CLOSE_CENTS } from '@/utils/pitchColors'
import {
  FOCUS_LEVEL_EMOJI,
  FOCUS_LEVEL_RULES,
  LEVEL_MIN_HOLD_MS,
  type FocusLevel,
  type FocusLevelRule,
} from './focusLevel'

type Props = {
  /* The take's current level, marked "You"; null before one is given */
  level: FocusLevel | null
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent' }),
)

const goalListFormat = computed(
  () => new Intl.ListFormat(locale.value, { type: 'conjunction' }),
)

function goalFor({ minOnPitchPercent, minSpotOnPercent }: FocusLevelRule) {
  if (minOnPitchPercent === 0) return t('pitchDetector.focus.guide.firstLevel')

  const goals = [
    t('pitchDetector.focus.guide.onPitchGoal', {
      percent: percentFormat.value.format(minOnPitchPercent / 100),
    }),
  ]
  if (minSpotOnPercent > 0) {
    goals.push(
      t('pitchDetector.focus.guide.spotOnGoal', {
        percent: percentFormat.value.format(minSpotOnPercent / 100),
      }),
    )
  }

  return goalListFormat.value.format(goals)
}

const rows = computed(() =>
  FOCUS_LEVEL_RULES.map((rule) => ({
    level: rule.level,
    goal: goalFor(rule),
    isCurrent: rule.level === props.level,
  })),
)
</script>

<template>
  <div class="flex flex-col gap-3 text-sm" data-testid="focus-level-ladder">
    <div>
      <p class="font-medium">
        {{
          t('pitchDetector.focus.guide.intro', {
            seconds: LEVEL_MIN_HOLD_MS / 1000,
          })
        }}
      </p>
      <p
        class="text-xs text-(--p-text-muted-color)"
        data-testid="focus-level-recent"
      >
        {{ t('pitchDetector.focus.guide.recent') }}
      </p>
    </div>

    <ol class="flex flex-col">
      <li
        v-for="row in rows"
        :key="row.level"
        class="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-2 rounded-md px-2 py-1"
        :class="{
          'bg-(--p-highlight-background) font-bold text-(--p-highlight-color)':
            row.isCurrent,
        }"
        :data-level="row.level"
        :data-current="row.isCurrent"
        :aria-current="row.isCurrent ? 'step' : undefined"
      >
        <span aria-hidden="true">{{ FOCUS_LEVEL_EMOJI[row.level] }}</span>
        <span>
          {{ t(`pitchDetector.focus.levels.${row.level}`) }}
          <span
            class="block text-xs font-normal text-(--p-text-muted-color)"
            data-testid="focus-level-goal"
          >
            {{ row.goal }}
          </span>
        </span>
        <span v-if="row.isCurrent" class="text-xs">
          {{ t('pitchDetector.focus.guide.you') }}
        </span>
      </li>
    </ol>

    <p class="text-xs text-(--p-text-muted-color)">
      {{
        t('pitchDetector.focus.guide.legend', {
          onPitchCents: CLOSE_CENTS,
          spotOnCents: CLEAN_CENTS,
        })
      }}
    </p>
  </div>
</template>

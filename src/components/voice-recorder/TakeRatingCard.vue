<script setup lang="ts">
import { FOCUS_LEVEL_EMOJI } from '@/components/pitch-detector/focusLevel'

import { MIN_RATED_VOICED_MS, type TakeRating } from './takeRating'

type Props = {
  rating: TakeRating | null
  /* Time with a clear pitch: breaths, pauses and slides don't count. */
  voicedMs: number
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

const minSeconds = MIN_RATED_VOICED_MS / 1000
/* Rounded down, so it never shows "15 of 15" for a take that fell short. */
const heardSeconds = computed(() => Math.floor(props.voicedMs / 1000))
/* No rating can also mean too few notes; the time is only shown when it's the
 * reason, since "17 of 15 seconds" would contradict itself. */
const isShortOfSinging = computed(() => props.voicedMs < MIN_RATED_VOICED_MS)
const percentFormat = computed(
  () => new Intl.NumberFormat(locale.value, { style: 'percent' }),
)

const meters = computed(() => {
  const rating = props.rating
  if (!rating) return []

  return [
    { key: 'centring', score: rating.centring },
    { key: 'steadiness', score: rating.steadiness },
    { key: 'key', score: rating.stayInKey },
  ].flatMap(({ key, score }) =>
    score === null
      ? []
      : [
          {
            key,
            label: t(`voiceRecorder.rating.${key}`),
            percent: score * 100,
            value: percentFormat.value.format(score),
          },
        ],
  )
})
</script>

<template>
  <section class="flex flex-col gap-3" data-testid="take-rating">
    <h2 class="text-sm font-semibold">
      {{ t('voiceRecorder.rating.title') }}
    </h2>

    <p
      v-if="!rating"
      class="text-sm text-(--p-text-muted-color)"
      data-testid="take-rating-too-short"
      :data-reason="isShortOfSinging ? 'singing-time' : 'notes'"
    >
      {{
        isShortOfSinging
          ? t('voiceRecorder.rating.notEnoughSinging', {
              heard: heardSeconds,
              seconds: minSeconds,
            })
          : t('voiceRecorder.rating.tooShort', { seconds: minSeconds })
      }}
    </p>

    <template v-else>
      <p
        class="flex items-center gap-2 text-lg font-semibold"
        data-testid="take-rating-level"
        :data-level="rating.level"
      >
        <span aria-hidden="true">{{ FOCUS_LEVEL_EMOJI[rating.level] }}</span>
        {{ t(`pitchDetector.focus.levels.${rating.level}`) }}
      </p>

      <ul class="flex flex-col gap-2">
        <li
          v-for="meter in meters"
          :key="meter.key"
          class="grid grid-cols-[7rem_1fr_3rem] items-center gap-2 text-xs"
          data-testid="take-rating-meter"
          :data-meter="meter.key"
        >
          <span class="text-(--p-text-muted-color)">{{ meter.label }}</span>
          <span
            class="block h-2 overflow-hidden rounded bg-(--p-content-border-color)"
          >
            <span
              class="block h-full rounded-e bg-(--p-primary-color)"
              :style="{ width: `${meter.percent}%` }"
            />
          </span>
          <span class="text-end tabular-nums">{{ meter.value }}</span>
        </li>
      </ul>

      <p class="text-sm" data-testid="take-rating-tip">
        {{ t(`voiceRecorder.rating.tips.${rating.tip}`) }}
      </p>

      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt class="text-(--p-text-muted-color)">
          {{ t('voiceRecorder.rating.cleanStarts') }}
        </dt>
        <dd>{{ percentFormat.format(rating.cleanStartShare) }}</dd>
      </dl>

      <p class="text-xs text-(--p-text-muted-color)">
        {{ t('voiceRecorder.rating.note') }}
      </p>
    </template>
  </section>
</template>

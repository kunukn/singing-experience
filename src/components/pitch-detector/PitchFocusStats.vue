<script setup lang="ts">
import type { FocusToneStats } from './focusToneTracker'

type Props = {
  stats: FocusToneStats
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

const secondsFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'unit',
      unit: 'second',
      unitDisplay: 'narrow',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }),
)

/* "+12" / "−8" — the sign is the point: it says sharp or flat */
const signedCentsFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      signDisplay: 'exceptZero',
      maximumFractionDigits: 0,
    }),
)

const centsFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 0 }),
)

const percentFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'percent',
      maximumFractionDigits: 0,
    }),
)

const hasData = computed(() => props.stats.holdMs > 0)

const items = computed(() => [
  {
    key: 'holdTime',
    label: t('pitchDetector.focus.holdTime'),
    value: secondsFormat.value.format(props.stats.holdMs / 1000),
  },
  {
    key: 'average',
    label: t('pitchDetector.focus.average'),
    value: hasData.value
      ? `${signedCentsFormat.value.format(props.stats.averageCents)}¢`
      : '-',
  },
  {
    key: 'wobble',
    label: t('pitchDetector.focus.wobble'),
    value: hasData.value
      ? `${centsFormat.value.format(props.stats.wobbleCents)}¢`
      : '-',
  },
  {
    key: 'inTune',
    label: t('pitchDetector.focus.inTune'),
    value: hasData.value
      ? percentFormat.value.format(props.stats.inTunePercent / 100)
      : '-',
  },
])
</script>

<template>
  <dl
    class="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4"
    data-testid="pitch-focus-stats"
  >
    <div
      v-for="item in items"
      :key="item.key"
      class="flex flex-col items-center"
    >
      <dt class="text-xs text-(--p-text-muted-color)">{{ item.label }}</dt>
      <!-- dir="ltr": a signed value like "+20¢" would otherwise be reordered
           to "20¢+" by the bidi algorithm in Arabic -->
      <dd
        class="text-lg tabular-nums"
        dir="ltr"
        :data-testid="`focus-stat-${item.key}`"
      >
        {{ item.value }}
      </dd>
    </div>
  </dl>
</template>

<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { octaveStopColor } from '@/utils/pitchColors'
import {
  compareWithVoiceTypes,
  type VoiceTypeComparisonRow,
} from './voiceTypeComparison'

type Props = {
  /* The singer's range, drawn against every voice type */
  midiMin: number
  midiMax: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectRange: [rangeIndex: number]
}>()

const { t, locale } = useI18n()
const { isDark } = useDarkMode()

/* E2–C6: Bass bottom to Soprano top, so every voice fits whole. Widened when
 * the singer's own range runs past it, so their guide lines stay on screen. */
const AXIS_MIN_MIDI = 40
const AXIS_MAX_MIDI = 84

/* Opacity of the part of a voice the singer doesn't reach yet — faint enough
 * that the solid covered part reads as "yours" at a glance. */
const UNCOVERED_OPACITY = 0.25

const axisMin = computed(() => Math.min(AXIS_MIN_MIDI, props.midiMin))
const axisMax = computed(() => Math.max(AXIS_MAX_MIDI, props.midiMax))

const toPercent = (midi: number) =>
  ((midi - axisMin.value) / (axisMax.value - axisMin.value)) * 100

/* Every C on the axis, as orientation marks for the tracks */
const ticks = computed(() => {
  const firstC = Math.ceil(axisMin.value / 12) * 12

  return Array.from(
    { length: Math.floor((axisMax.value - firstC) / 12) + 1 },
    (_, index) => {
      const midi = firstC + index * 12

      return { midi, label: midiToNoteLabel(midi).label, left: toPercent(midi) }
    },
  )
})

const percentFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'percent',
      maximumFractionDigits: 0,
    }),
)

const formatNote = (midi: number) => midiToNoteLabel(midi).label

/* Arrows and note names read the same in every language, so they are composed
 * here; only the spoken sentence goes through i18n. */
function reachHint(row: VoiceTypeComparisonRow): string {
  const parts = [
    row.reachDownTo === null ? null : `↓${formatNote(row.reachDownTo)}`,
    row.reachUpTo === null ? null : `↑${formatNote(row.reachUpTo)}`,
  ].filter(Boolean)

  return parts.length ? parts.join(' ') : '✓'
}

function reachSentence(row: VoiceTypeComparisonRow): string {
  if (row.reachDownTo !== null && row.reachUpTo !== null)
    return t('voiceRangeFinder.compare.reachBoth', {
      low: formatNote(row.reachDownTo),
      high: formatNote(row.reachUpTo),
    })
  if (row.reachDownTo !== null)
    return t('voiceRangeFinder.compare.reachDown', {
      note: formatNote(row.reachDownTo),
    })
  if (row.reachUpTo !== null)
    return t('voiceRangeFinder.compare.reachUp', {
      note: formatNote(row.reachUpTo),
    })

  return t('voiceRangeFinder.compare.covered')
}

const rows = computed(() =>
  compareWithVoiceTypes(props.midiMin, props.midiMax).map((row) => {
    const name = t(row.labelKey)
    const percent = percentFormat.value.format(row.coverage)

    return {
      ...row,
      name,
      percent,
      hint: reachHint(row),
      color: octaveStopColor(row.stopIndex, isDark.value),
      faintColor: octaveStopColor(
        row.stopIndex,
        isDark.value,
        UNCOVERED_OPACITY,
      ),
      voiceStyle: {
        insetInlineStart: `${toPercent(row.voiceMin)}%`,
        width: `${toPercent(row.voiceMax) - toPercent(row.voiceMin)}%`,
      },
      coveredStyle: row.covered && {
        insetInlineStart: `${toPercent(row.covered.midiMin)}%`,
        width: `${toPercent(row.covered.midiMax) - toPercent(row.covered.midiMin)}%`,
      },
      ariaLabel: `${t('voiceRangeFinder.compare.rowLabel', {
        name,
        from: formatNote(row.voiceMin),
        to: formatNote(row.voiceMax),
        percent,
      })} ${reachSentence(row)}`,
    }
  }),
)

const guideLines = computed(() => [
  toPercent(props.midiMin),
  toPercent(props.midiMax),
])
</script>

<template>
  <div class="flex w-full flex-col gap-2" data-testid="voice-type-comparison">
    <h3 class="text-xs font-medium text-(--p-text-muted-color)">
      {{ t('voiceRangeFinder.compare.title') }}
    </h3>

    <!--
      One grid for the tick header and every row (rows join it through
      subgrid), so names, tracks, percentages and hints line up in columns
      whatever their text length.
    -->
    <div
      class="grid grid-cols-[auto_1fr_auto_auto] items-center gap-x-2 gap-y-1"
    >
      <div aria-hidden="true" class="col-span-4 grid grid-cols-subgrid">
        <div class="relative col-start-2 h-4" dir="ltr">
          <span
            v-for="tick in ticks"
            :key="tick.midi"
            class="absolute -translate-x-1/2 text-[10px] text-(--p-text-muted-color)"
            :style="{ insetInlineStart: `${tick.left}%` }"
          >
            {{ tick.label }}
          </span>
        </div>
      </div>

      <button
        v-for="row in rows"
        :key="row.labelKey"
        type="button"
        data-testid="voice-type-comparison-row"
        :data-voice-type="row.labelKey"
        :data-coverage="Math.round(row.coverage * 100)"
        :data-best-fit="row.isBestFit"
        :aria-label="row.ariaLabel"
        class="col-span-4 grid min-h-6 cursor-pointer grid-cols-subgrid items-center rounded border-none bg-transparent p-0 text-start text-(--p-text-color)"
        @click="emit('selectRange', row.rangeIndex)"
      >
        <span
          aria-hidden="true"
          class="text-xs whitespace-nowrap"
          :class="{ 'font-semibold': row.isBestFit }"
        >
          {{ row.name }}
        </span>
        <!--
          Pinned left-to-right: a horizontal pitch axis runs low → high in every
          locale, like a keyboard (see GraceKellyPartLadder.vue).
        -->
        <span aria-hidden="true" class="relative h-6" dir="ltr">
          <span
            class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
            :style="{ ...row.voiceStyle, backgroundColor: row.faintColor }"
          />
          <span
            v-if="row.coveredStyle"
            class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
            :style="{ ...row.coveredStyle, backgroundColor: row.color }"
          />
          <!-- The singer's two ends, repeated per row so they read as one line down the list -->
          <span
            v-for="(left, index) in guideLines"
            :key="index"
            class="absolute inset-y-0 w-px bg-(--p-text-muted-color) opacity-60"
            :style="{ insetInlineStart: `${left}%` }"
          />
        </span>
        <span
          aria-hidden="true"
          class="text-end text-xs whitespace-nowrap text-(--p-text-muted-color) tabular-nums"
          :class="{ 'font-semibold text-(--p-text-color)': row.isBestFit }"
        >
          {{ row.percent }}
        </span>
        <span
          aria-hidden="true"
          class="text-xs whitespace-nowrap tabular-nums"
          dir="ltr"
          data-testid="voice-type-comparison-hint"
        >
          {{ row.hint }}
        </span>
      </button>
    </div>

    <p class="text-xs text-(--p-text-muted-color)">
      {{ t('voiceRangeFinder.compare.explainer') }}
    </p>
  </div>
</template>

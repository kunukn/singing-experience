<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { cleanTextColor, octaveStopColor } from '@/utils/pitchColors'
import { VOICE_TYPES } from '@/utils/voiceRangeSegments'
import { centsOffNearest } from './useRangeFinder'
import {
  compareWithVoiceTypes,
  type VoiceTypeComparisonRow,
} from './voiceTypeComparison'

type Props = {
  /* The singer's range, drawn against every voice type. Leave both out to
   * explore: the voices alone, lit up where the live note falls. */
  midiMin?: number
  midiMax?: number
  /* The note being sung right now, fractional so cents move the line; null when silent */
  liveMidi?: number | null
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

const range = computed(() =>
  props.midiMin === undefined || props.midiMax === undefined
    ? null
    : { midiMin: props.midiMin, midiMax: props.midiMax },
)

const axisMin = computed(() =>
  Math.min(AXIS_MIN_MIDI, range.value?.midiMin ?? AXIS_MIN_MIDI),
)
const axisMax = computed(() =>
  Math.max(AXIS_MAX_MIDI, range.value?.midiMax ?? AXIS_MAX_MIDI),
)

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

const trackStyle = (midiMin: number, midiMax: number) => ({
  insetInlineStart: `${toPercent(midiMin)}%`,
  width: `${toPercent(midiMax) - toPercent(midiMin)}%`,
})

type ChartRow = {
  labelKey: string
  rangeIndex: number
  name: string
  color: string
  faintColor: string
  voiceStyle: ReturnType<typeof trackStyle>
  /* The solid part of the bar, or null when the whole bar is faint */
  solidStyle: ReturnType<typeof trackStyle> | null
  ariaLabel: string
  /* With a range only: how much of this voice the singer covers */
  comparison: {
    coverage: number
    percent: string
    hint: string
    isBestFit: boolean
  } | null
  /* Exploring only: the live note sits inside this voice */
  isSounding: boolean | null
}

const rowColors = (stopIndex: number) => ({
  color: octaveStopColor(stopIndex, isDark.value),
  faintColor: octaveStopColor(stopIndex, isDark.value, UNCOVERED_OPACITY),
})

const compareRows = (midiMin: number, midiMax: number): ChartRow[] =>
  compareWithVoiceTypes(midiMin, midiMax).map((row) => {
    const name = t(row.labelKey)
    const percent = percentFormat.value.format(row.coverage)

    return {
      labelKey: row.labelKey,
      rangeIndex: row.rangeIndex,
      name,
      ...rowColors(row.stopIndex),
      voiceStyle: trackStyle(row.voiceMin, row.voiceMax),
      solidStyle:
        row.covered && trackStyle(row.covered.midiMin, row.covered.midiMax),
      ariaLabel: `${t('voiceRangeFinder.compare.rowLabel', {
        name,
        from: formatNote(row.voiceMin),
        to: formatNote(row.voiceMax),
        percent,
      })} ${reachSentence(row)}`,
      comparison: {
        coverage: row.coverage,
        percent,
        hint: reachHint(row),
        isBestFit: row.isBestFit,
      },
      isSounding: null,
    }
  })

/* The note as the readout names it, so a lit row always agrees with the label */
const liveNote = computed(() =>
  props.liveMidi == null ? null : Math.round(props.liveMidi),
)

/* High to low, as every vertical pitch list in the app reads */
const exploreRows = (): ChartRow[] =>
  VOICE_TYPES.map(({ range: voice, rangeIndex }, stopIndex) => {
    const name = t(voice.labelKey)
    const voiceStyle = trackStyle(voice.midiMin, voice.midiMax)
    const isSounding =
      liveNote.value !== null &&
      liveNote.value >= voice.midiMin &&
      liveNote.value <= voice.midiMax

    return {
      labelKey: voice.labelKey,
      rangeIndex,
      name,
      ...rowColors(stopIndex),
      voiceStyle,
      solidStyle: isSounding ? voiceStyle : null,
      ariaLabel: t('generic.voiceTypeSpan', {
        name,
        from: formatNote(voice.midiMin),
        to: formatNote(voice.midiMax),
      }),
      comparison: null,
      isSounding,
    }
  }).toReversed()

const rows = computed(() =>
  range.value
    ? compareRows(range.value.midiMin, range.value.midiMax)
    : exploreRows(),
)

/* Rows adopt a voice as My range, which only makes sense beside My range */
function selectRow(row: ChartRow) {
  if (range.value) emit('selectRange', row.rangeIndex)
}

/* The singer's two ends: drawn as a line through every row and labelled once
 * in the footer, so the lines read as "your range" */
const guideLines = computed(() =>
  range.value
    ? [range.value.midiMin, range.value.midiMax].map((midi) => ({
        midi,
        left: toPercent(midi),
        label: formatNote(midi),
      }))
    : [],
)

/* Pinned to the chart's edge rather than widening the axis: a live note
 * resizing the axis would rescale every bar while the singer sings. */
const liveLeft = computed(() => {
  if (props.liveMidi == null) return null

  return toPercent(
    Math.min(axisMax.value, Math.max(axisMin.value, props.liveMidi)),
  )
})

/* What the line is: the real note even when the line is pinned to an edge.
 * It sits on the roomier side of the line, so it never leaves the track. */
const liveLabel = computed(() => {
  if (props.liveMidi == null || liveLeft.value === null) return null

  const cents = Math.round(centsOffNearest(props.liveMidi))

  return {
    note: formatNote(Math.round(props.liveMidi)),
    centsText: cents > 0 ? `+${cents}¢` : `${cents}¢`,
    centsColor: cleanTextColor(cents, isDark.value),
    side: liveLeft.value < 50 ? 'end' : 'start',
  }
})
</script>

<template>
  <div class="flex w-full flex-col gap-2" data-testid="voice-type-comparison">
    <h3 class="text-xs font-medium text-(--p-text-muted-color)">
      {{
        range
          ? t('voiceRangeFinder.compare.title')
          : t('voiceRangeFinder.compare.exploreTitle')
      }}
    </h3>

    <!--
      One grid for the tick header and every row (rows join it through
      subgrid), so names, tracks, percentages and hints line up in columns
      whatever their text length. Exploring drops the % and hint columns.
    -->
    <div
      class="relative grid items-center gap-x-2 gap-y-1"
      :class="range ? 'grid-cols-[auto_1fr_auto_auto]' : 'grid-cols-[auto_1fr]'"
    >
      <div aria-hidden="true" class="col-span-full grid grid-cols-subgrid">
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

      <!-- A plain row while exploring: tapping it must not rewrite My range from another tab -->
      <component
        :is="range ? 'button' : 'div'"
        v-for="row in rows"
        :key="row.labelKey"
        :type="range ? 'button' : undefined"
        :role="range ? undefined : 'img'"
        data-testid="voice-type-comparison-row"
        :data-voice-type="row.labelKey"
        :data-coverage="
          row.comparison ? Math.round(row.comparison.coverage * 100) : undefined
        "
        :data-best-fit="row.comparison?.isBestFit"
        :data-sounding="row.isSounding ?? undefined"
        :aria-label="row.ariaLabel"
        class="col-span-full grid min-h-6 grid-cols-subgrid items-center rounded border-none bg-transparent p-0 text-start text-(--p-text-color)"
        :class="{ 'cursor-pointer': range }"
        @click="selectRow(row)"
      >
        <!--
          Exploring lights the name with colour, not weight: the name column is
          auto-sized, so a bold name changing on every note shifted the bars.
          Best fit can stay bold — it only changes when the range is edited.
        -->
        <span
          aria-hidden="true"
          class="text-xs whitespace-nowrap"
          :class="
            row.comparison
              ? { 'font-semibold': row.comparison.isBestFit }
              : row.isSounding
                ? 'text-(--p-text-color)'
                : 'text-(--p-text-muted-color)'
          "
        >
          {{ row.name }}
        </span>
        <!--
          Pinned left-to-right: a horizontal pitch axis runs low → high in every
          locale, like a keyboard (see GraceKellyPartLadder.vue).
        -->
        <span aria-hidden="true" class="relative h-6" dir="ltr">
          <!-- Faint C marks under the bars, lining up with the header labels -->
          <span
            v-for="tick in ticks"
            :key="tick.midi"
            class="absolute inset-y-0 w-0 border-s border-dashed border-(--p-content-border-color)"
            :style="{ insetInlineStart: `${tick.left}%` }"
          />
          <span
            class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
            :style="{ ...row.voiceStyle, backgroundColor: row.faintColor }"
          />
          <span
            v-if="row.solidStyle"
            class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
            :style="{ ...row.solidStyle, backgroundColor: row.color }"
          />
          <!-- The singer's two ends, repeated per row so they read as one line down the list -->
          <span
            v-for="(line, index) in guideLines"
            :key="index"
            class="absolute inset-y-0 w-px bg-(--p-text-muted-color) opacity-60"
            :style="{ insetInlineStart: `${line.left}%` }"
          />
          <!-- The live note; 75 ms glide smooths detector jitter without lagging the voice -->
          <span
            v-if="liveLeft !== null"
            data-testid="voice-type-comparison-live-line"
            class="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-(--p-primary-color) transition-[inset-inline-start] duration-75 ease-linear motion-reduce:transition-none"
            :style="{ insetInlineStart: `${liveLeft}%` }"
          />
        </span>
        <template v-if="row.comparison">
          <span
            aria-hidden="true"
            class="text-end text-xs whitespace-nowrap text-(--p-text-muted-color) tabular-nums"
            :class="{
              'font-semibold text-(--p-text-color)': row.comparison.isBestFit,
            }"
          >
            {{ row.comparison.percent }}
          </span>
          <span
            aria-hidden="true"
            class="text-xs whitespace-nowrap tabular-nums"
            dir="ltr"
            data-testid="voice-type-comparison-hint"
          >
            {{ row.comparison.hint }}
          </span>
        </template>
      </component>

      <!--
        Spans the track column of the six voice rows (grid rows 2–7). Absolute,
        so it takes its area from the grid without auto-placement pushing the
        rows aside; pointer-events-none keeps the rows tappable beneath it.
        Both column lines are explicit: an absolute item's auto end line is
        the container's edge, not the next grid line.
      -->
      <div
        v-if="liveLabel"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 col-start-2 col-end-3 row-span-6 row-start-2"
        dir="ltr"
      >
        <span
          data-testid="voice-type-comparison-live-label"
          :data-side="liveLabel.side"
          class="absolute top-1/2 -translate-y-1/2 rounded bg-(--p-content-background) px-1 text-xs whitespace-nowrap tabular-nums transition-[inset-inline-start] duration-75 ease-linear motion-reduce:transition-none"
          :class="
            liveLabel.side === 'start' ? '-ms-1 -translate-x-full' : 'ms-1'
          "
          :style="{ insetInlineStart: `${liveLeft}%` }"
        >
          <span class="font-semibold">{{ liveLabel.note }}</span>
          {{ ' ' }}
          <span :style="{ color: liveLabel.centsColor }">
            {{ liveLabel.centsText }}
          </span>
        </span>
      </div>

      <!--
        Each label sits on the outer side of its line (low end to the left,
        high end to the right), so the two never overlap, even for a one-note range.
      -->
      <div
        v-if="range"
        aria-hidden="true"
        class="col-span-full grid grid-cols-subgrid"
      >
        <div class="relative col-start-2 h-4" dir="ltr">
          <span
            v-for="(line, index) in guideLines"
            :key="index"
            data-testid="voice-type-comparison-range-label"
            class="absolute text-[10px] font-semibold whitespace-nowrap text-(--p-text-color)"
            :class="index === 0 ? '-translate-x-full pe-1' : 'ps-1'"
            :style="{ insetInlineStart: `${line.left}%` }"
          >
            {{ line.label }}
          </span>
        </div>
      </div>
    </div>

    <p class="text-xs text-(--p-text-muted-color)">
      {{
        range
          ? t('voiceRangeFinder.compare.explainer')
          : t('voiceRangeFinder.compare.exploreExplainer')
      }}
    </p>
  </div>
</template>

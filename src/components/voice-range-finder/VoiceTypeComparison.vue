<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { directionalTextColor, voiceTypeColor } from '@/utils/pitchColors'
import { VOICE_TYPES } from '@/utils/voiceRangeSegments'
import { FAMOUS_SINGERS } from './famousSingers'
import { centsLabel } from './useLiveCents'
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
  /* "See my voice" is on. Off fades every bar, so the chart reads as asleep
   * rather than as a voice that matches nothing. */
  isListening?: boolean
  /* Exploring only: add famous singers below the voice types */
  showSingers?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isListening: true,
  showSingers: false,
})

const { t, locale } = useI18n()
const { isDark } = useDarkMode()
const { myVoiceRange } = useMyVoiceRange()

/* E2–C6: Bass bottom to Soprano top, so every voice fits whole. Widened when
 * the singer's own range runs past it, so their guide lines stay on screen. */
const AXIS_MIN_MIDI = 40
const AXIS_MAX_MIDI = 84

/* Semitones of room past Bass and Soprano while exploring, so the note labels
 * beside the outermost bar ends (E2, C6) fit on a phone-width track. Three
 * puts the edges on C♯2 and D♯6, so no C tick lands half off the edge. */
const EXPLORE_AXIS_PADDING = 3

/* Opacity of the part of a voice the singer doesn't reach yet — faint enough
 * that the solid covered part reads as "yours" at a glance. */
const UNCOVERED_OPACITY = 0.25

const range = computed(() =>
  props.midiMin === undefined || props.midiMax === undefined
    ? null
    : { midiMin: props.midiMin, midiMax: props.midiMax },
)

const axisMin = computed(() =>
  range.value
    ? Math.min(AXIS_MIN_MIDI, range.value.midiMin)
    : AXIS_MIN_MIDI - EXPLORE_AXIS_PADDING,
)
const axisMax = computed(() =>
  range.value
    ? Math.max(AXIS_MAX_MIDI, range.value.midiMax)
    : AXIS_MAX_MIDI + EXPLORE_AXIS_PADDING,
)

const toPercent = (midi: number) =>
  ((midi - axisMin.value) / (axisMax.value - axisMin.value)) * 100

/* The lowest note any voice type sings — Bass's E2 (VOICE_TYPES is sorted low first) */
const LOWEST_VOICE_MIDI = VOICE_TYPES[0]!.range.midiMin

/* Every C on the axis, as orientation marks for the tracks. Beside My range
 * the Bass bottom joins them, so the chart's low end is named like C6 names
 * its top. Exploring leaves it out: Bass's own bar-end label names it there. */
const ticks = computed(() => {
  const firstC = Math.ceil(axisMin.value / 12) * 12
  const cs = Array.from(
    { length: Math.floor((axisMax.value - firstC) / 12) + 1 },
    (_, index) => firstC + index * 12,
  )
  const midis =
    range.value && !cs.includes(LOWEST_VOICE_MIDI)
      ? [LOWEST_VOICE_MIDI, ...cs].sort((a, b) => a - b)
      : cs

  return midis.map((midi) => ({
    midi,
    label: midiToNoteLabel(midi).label,
    left: toPercent(midi),
  }))
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

/* The name column is as wide as its longest name, so one long name squeezes
 * every bar on a phone. A narrow chart shows the short name singers use
 * ("Mezzo"), a wide one the full name; the aria label always keeps the full one. */
const SHORT_LABEL_KEYS: Partial<Record<string, string>> = {
  'voiceRanges.mezzoSoprano': 'voiceRanges.mezzoSopranoShort',
}

const shortName = (labelKey: string) =>
  t(SHORT_LABEL_KEYS[labelKey] ?? labelKey)

/* Faux bold for the best fit's name and percentage: a text stroke is paint
 * only, so the letters thicken in place. Real semibold glyphs are wider, so
 * the name and its column grew whenever the best fit moved to another row.
 * Same trick and weight as exploring's lit name (see the template). */
const BEST_FIT_EMPHASIS = '[-webkit-text-stroke:0.4px_currentColor]'

/* Exploring's group headings. Colour and size carry it, not only weight, so they
 * don't read as one more row of muted names. */
const EXPLORE_HEADING = 'text-sm font-semibold text-(--p-text-color)'

type ChartRow = {
  /* The voice's labelKey, or the singer's id */
  id: string
  kind: 'voice' | 'singer' | 'myRange'
  name: string
  /* Shown instead of `name` while the chart is narrow */
  shortName: string
  color: string
  faintColor: string
  /* The name and end notes while the live note sits inside this row */
  soundingColor: string
  /* Only My range draws its span striped rather than in a colour */
  voiceStyle: ReturnType<typeof trackStyle> & { backgroundImage?: string }
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
  /* Exploring only: the live note sits inside this voice. The bar stays
   * solid either way — a bar fading in and out on every note distracted —
   * so the name and end notes carry the signal instead. */
  isSounding: boolean | null
  /* Listening is off, so the whole bar is drawn faint */
  isFaded: boolean
  /* Exploring only: the voice's own notes, labelled at each end of its bar */
  ends: {
    startLabel: string
    endLabel: string
    startLeft: number
    endLeft: number
    /* Below E2 there's no room beside the bar, so the note sits inside it */
    isStartInside: boolean
  } | null
}

const rowColors = (stopIndex: number) => {
  const color = voiceTypeColor(stopIndex, isDark.value)

  return {
    color,
    faintColor: voiceTypeColor(stopIndex, isDark.value, UNCOVERED_OPACITY),
    soundingColor: color,
  }
}

/* One neutral colour for every singer: a voice type's colour would classify
 * them as that voice. Mixed rather than faded with opacity, like the range bar's
 * stripes, so the same value works in dark mode. */
const SINGER_COLORS = {
  color: 'var(--p-text-muted-color)',
  faintColor: `color-mix(in srgb, var(--p-text-muted-color) ${UNCOVERED_OPACITY * 100}%, transparent)`,
  soundingColor: 'var(--p-text-color)',
}

const compareRows = (midiMin: number, midiMax: number): ChartRow[] =>
  compareWithVoiceTypes(midiMin, midiMax).map((row) => {
    const name = t(row.labelKey)
    const percent = percentFormat.value.format(row.coverage)

    return {
      id: row.labelKey,
      kind: 'voice',
      name,
      shortName: shortName(row.labelKey),
      ...rowColors(row.stopIndex),
      voiceStyle: trackStyle(row.voiceMin, row.voiceMax),
      solidStyle:
        props.isListening && row.covered
          ? trackStyle(row.covered.midiMin, row.covered.midiMax)
          : null,
      ariaLabel: [
        t('voiceRangeFinder.compare.rowLabel', {
          name,
          from: formatNote(row.voiceMin),
          to: formatNote(row.voiceMax),
          percent,
        }),
        reachSentence(row),
        row.isBestFit ? t('voiceRangeFinder.compare.bestFit') : null,
      ]
        .filter(Boolean)
        .join(' '),
      comparison: {
        coverage: row.coverage,
        percent,
        hint: reachHint(row),
        isBestFit: row.isBestFit,
      },
      isSounding: null,
      isFaded: !props.isListening,
      ends: null,
    }
  })

/* The note as the readout names it, so a lit row always agrees with the label */
const liveNote = computed(() =>
  props.liveMidi == null ? null : Math.round(props.liveMidi),
)

/* What a voice row and a singer row share: a span lit up by the live note */
const exploreRow = (
  midiMin: number,
  midiMax: number,
  row: Pick<
    ChartRow,
    | 'id'
    | 'kind'
    | 'name'
    | 'shortName'
    | 'color'
    | 'faintColor'
    | 'soundingColor'
  >,
): ChartRow => {
  const voiceStyle = trackStyle(midiMin, midiMax)

  return {
    ...row,
    voiceStyle,
    solidStyle: props.isListening ? voiceStyle : null,
    ariaLabel: t('generic.voiceTypeSpan', {
      name: row.name,
      from: formatNote(midiMin),
      to: formatNote(midiMax),
    }),
    comparison: null,
    isSounding:
      liveNote.value !== null &&
      liveNote.value >= midiMin &&
      liveNote.value <= midiMax,
    isFaded: !props.isListening,
    ends: {
      startLabel: formatNote(midiMin),
      endLabel: formatNote(midiMax),
      startLeft: toPercent(midiMin),
      endLeft: toPercent(midiMax),
      isStartInside: false,
    },
  }
}

/* High to low, as every vertical pitch list in the app reads */
const exploreVoiceRows = (): ChartRow[] =>
  VOICE_TYPES.map(({ range: voice }, stopIndex) =>
    exploreRow(voice.midiMin, voice.midiMax, {
      id: voice.labelKey,
      kind: 'voice',
      name: t(voice.labelKey),
      shortName: shortName(voice.labelKey),
      ...rowColors(stopIndex),
    }),
  ).toReversed()

const exploreSingerRows = (): ChartRow[] =>
  FAMOUS_SINGERS.map(({ id, name, shortName, midiMin, midiMax }) =>
    exploreRow(midiMin, midiMax, {
      id,
      kind: 'singer',
      name,
      shortName,
      ...SINGER_COLORS,
    }),
  )

/* The singer's own range, to hold up against the famous singers. Striped and
 * never faded, like its bar beside My range. Its low end can pass the axis (C2,
 * the axis starts on C♯2), so that's clipped: widening the axis would rescale
 * every bar on a toggle. The label keeps the real note. */
const exploreMyRangeRow = (): ChartRow => {
  const { midiMin, midiMax } = myVoiceRange.value
  const clippedMin = Math.max(axisMin.value, midiMin)
  const name = t('voiceRanges.myRange')
  const row = exploreRow(midiMin, midiMax, {
    id: 'myRange',
    kind: 'myRange',
    name,
    shortName: name,
    ...SINGER_COLORS,
    faintColor: 'transparent',
  })

  return {
    ...row,
    voiceStyle: {
      ...trackStyle(clippedMin, midiMax),
      backgroundImage: RANGE_BAR_STRIPES,
    },
    solidStyle: null,
    isFaded: false,
    ends: row.ends && {
      ...row.ends,
      startLeft: toPercent(clippedMin),
      isStartInside: midiMin < AXIS_MIN_MIDI,
    },
  }
}

const rows = computed(() => {
  if (range.value) return compareRows(range.value.midiMin, range.value.midiMax)

  return props.showSingers
    ? [...exploreVoiceRows(), ...exploreSingerRows(), exploreMyRangeRow()]
    : exploreVoiceRows()
})

/* The singers' subheading sits above the first singer, as a grid row of its own */
const firstSingerId = computed(
  () => rows.value.find((row) => row.kind === 'singer')?.id ?? null,
)

/* The live label's grid area. With singers it takes the subheading's row, the
 * one row with no bar to cover (+1: grid lines count from 1, and exploring has
 * no tick header). Otherwise it centres on the voice rows, below the tick
 * header beside My range. Inline because Tailwind can't see a class built at
 * runtime. */
const liveLabelGridRow = computed(() => {
  const firstSingerIndex = rows.value.findIndex((row) => row.kind === 'singer')

  if (firstSingerIndex !== -1) return `${firstSingerIndex + 1} / span 1`

  return `${range.value ? 2 : 1} / span ${rows.value.length}`
})

/* No best fit when the range misses every voice, so no ★ to explain */
const hasBestFit = computed(() =>
  rows.value.some((row) => row.comparison?.isBestFit),
)

/* The singer's own range as a bar of its own, in the footer between its two
 * labels. Voice types are fixed, so their bars are solid; a singer's range
 * grows with practice, so theirs is striped — "not final" — in the guide
 * lines' grey. Stripes rather than an outline: an empty middle made the bar
 * look thinner than the 8px voice bars beside it. The colour is mixed, not
 * faded with opacity, so the same value works in dark mode. */
const RANGE_BAR_STRIPES =
  'repeating-linear-gradient(-45deg, color-mix(in srgb, var(--p-text-muted-color) 60%, transparent) 0 2px, transparent 2px 5px)'

const rangeBarStyle = computed(() =>
  range.value
    ? {
        ...trackStyle(range.value.midiMin, range.value.midiMax),
        backgroundImage: RANGE_BAR_STRIPES,
      }
    : null,
)

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

/* The live line's colour: the guide lines' grey, but solid. */
const LIVE_LINE_COLOR = 'var(--p-text-muted-color)'

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
    centsText: centsLabel(cents),
    centsColor: directionalTextColor(cents, isDark.value),
    side: liveLeft.value < 50 ? 'end' : 'start',
  }
})
</script>

<template>
  <div
    class="@container flex w-full flex-col gap-2"
    data-testid="voice-type-comparison"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h3
        :class="
          range
            ? 'text-xs font-medium text-(--p-text-muted-color)'
            : EXPLORE_HEADING
        "
      >
        {{
          range
            ? t('voiceRangeFinder.compare.title')
            : t('voiceRangeFinder.compare.exploreTitle')
        }}
      </h3>
      <slot name="headerEnd" />
    </div>

    <!--
      One grid for the tick header and every row (rows join it through
      subgrid), so names, tracks, percentages and hints line up in columns
      whatever their text length. Exploring drops the % and hint columns,
      and the tick header: the bar-end labels already name every C line, and
      a second, differently placed "C6" read as a contradiction.
      Exploring reserves 6.25rem from @lg, where full names show: room for the
      longest singer's name, so the toggle doesn't rescale the voice bars.
    -->
    <div
      class="relative grid items-center gap-x-2 gap-y-1"
      :class="
        range
          ? 'grid-cols-[auto_1fr_auto_auto]'
          : 'grid-cols-[auto_1fr] @lg:grid-cols-[minmax(6.25rem,auto)_1fr]'
      "
    >
      <div
        v-if="range"
        aria-hidden="true"
        class="col-span-full grid grid-cols-subgrid"
      >
        <div class="relative col-start-2 h-4" dir="ltr">
          <span
            v-for="tick in ticks"
            :key="tick.midi"
            data-testid="voice-type-comparison-tick"
            class="absolute -translate-x-1/2 text-[10px] text-(--p-text-muted-color)"
            :style="{ insetInlineStart: `${tick.left}%` }"
          >
            {{ tick.label }}
          </span>
        </div>
      </div>

      <template v-for="row in rows" :key="row.id">
        <h3
          v-if="row.id === firstSingerId"
          class="col-span-full mt-4"
          :class="EXPLORE_HEADING"
          data-testid="voice-type-comparison-singers-title"
        >
          {{ t('voiceRangeFinder.compare.famousSingers') }}
        </h3>
        <!-- Read-only: a tap here once replaced My range, losing a range just found by singing -->
        <div
          role="img"
          data-testid="voice-type-comparison-row"
          :data-voice-type="row.kind === 'voice' ? row.id : undefined"
          :data-singer="row.kind === 'singer' ? row.id : undefined"
          :data-my-range="row.kind === 'myRange' || undefined"
          :data-coverage="
            row.comparison
              ? Math.round(row.comparison.coverage * 100)
              : undefined
          "
          :data-best-fit="row.comparison?.isBestFit"
          :data-sounding="row.isSounding ?? undefined"
          :data-faded="row.isFaded || undefined"
          :aria-label="row.ariaLabel"
          class="col-span-full grid min-h-6 grid-cols-subgrid items-center text-start text-(--p-text-color)"
        >
          <span
            v-if="row.comparison"
            aria-hidden="true"
            class="text-xs whitespace-nowrap"
            :class="{
              [BEST_FIT_EMPHASIS]: row.comparison.isBestFit,
            }"
          >
            <template v-if="row.shortName === row.name">{{
              row.name
            }}</template>
            <!-- Short on a narrow chart, full once the chart has room (container query) -->
            <template v-else>
              <span
                class="@lg:hidden"
                data-testid="voice-type-comparison-short-name"
                >{{ row.shortName }}</span
              >
              <span
                class="hidden @lg:inline"
                data-testid="voice-type-comparison-full-name"
                >{{ row.name }}</span
              >
            </template>
            <!--
            A shape, not only bold: it reads in dark mode, for colour-blind
            singers and in a screenshot. The aria label says it in words.
            After the name, so the names stay aligned at the start of the
            column and only the star moves when the best fit changes.
          -->
            <span
              v-if="row.comparison.isBestFit"
              data-testid="voice-type-comparison-best-fit-mark"
              >&nbsp;★</span
            >
          </span>
          <!--
          Exploring lights the name in its voice's colour and a faux bold. Real
          bold glyphs are wider, so the word visibly stretched on every note; a
          text stroke is paint only and thickens each letter in place.
          0.4px ≈ the stem gain from regular to semibold at 12px.
        -->
          <span
            v-else
            aria-hidden="true"
            class="text-xs whitespace-nowrap"
            :class="
              row.isSounding
                ? '[-webkit-text-stroke:0.4px_currentColor]'
                : 'text-(--p-text-muted-color)'
            "
            :style="row.isSounding ? { color: row.soundingColor } : undefined"
          >
            <template v-if="row.shortName === row.name">{{
              row.name
            }}</template>
            <!-- Short on a narrow chart, full once the chart has room (container query) -->
            <template v-else>
              <span
                class="@lg:hidden"
                data-testid="voice-type-comparison-short-name"
                >{{ row.shortName }}</span
              >
              <span
                class="hidden @lg:inline"
                data-testid="voice-type-comparison-full-name"
                >{{ row.name }}</span
              >
            </template>
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
              data-testid="voice-type-comparison-bar"
              class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
              :style="{ ...row.solidStyle, backgroundColor: row.color }"
            />
            <!-- Each note on the outer side of its end, so it never sits on the bar,
                 unless the chart has no room there (see isStartInside) -->
            <template v-if="row.ends">
              <span
                data-testid="voice-type-comparison-voice-start"
                class="absolute top-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap tabular-nums"
                :class="[
                  { 'text-(--p-text-muted-color)': !row.isSounding },
                  row.ends.isStartInside
                    ? 'bg-(--p-content-background) px-1'
                    : '-translate-x-full pe-1',
                ]"
                :data-inside="row.ends.isStartInside || undefined"
                :style="{
                  insetInlineStart: `${row.ends.startLeft}%`,
                  color: row.isSounding ? row.soundingColor : undefined,
                }"
              >
                {{ row.ends.startLabel }}
              </span>
              <span
                data-testid="voice-type-comparison-voice-end"
                class="absolute top-1/2 -translate-y-1/2 ps-1 text-[10px] whitespace-nowrap tabular-nums"
                :class="{ 'text-(--p-text-muted-color)': !row.isSounding }"
                :style="{
                  insetInlineStart: `${row.ends.endLeft}%`,
                  color: row.isSounding ? row.soundingColor : undefined,
                }"
              >
                {{ row.ends.endLabel }}
              </span>
            </template>
            <!-- The singer's two ends, repeated per row so they read as one line down the list -->
            <span
              v-for="(line, index) in guideLines"
              :key="index"
              class="absolute inset-y-0 w-px bg-(--p-text-muted-color) opacity-60"
              :style="{ insetInlineStart: `${line.left}%` }"
            />
            <!--
            The live note; 75 ms glide smooths detector jitter without lagging
            the voice. 1px, like the guide lines but solid. A fixed grey:
            coloured by cents it flickered green, blue and red on every wobble
            while singing; the cents label beside it still carries the tuning.
            The halo (background-coloured ring) keeps it visible on any bar,
            whatever the bar's colour.
          -->
            <span
              v-if="liveLabel"
              data-testid="voice-type-comparison-live-line"
              class="absolute inset-y-0 w-px -translate-x-1/2 transition-[inset-inline-start] duration-75 ease-linear motion-reduce:transition-none"
              :style="{
                insetInlineStart: `${liveLeft}%`,
                backgroundColor: LIVE_LINE_COLOR,
                boxShadow: '0 0 0 1px var(--p-content-background)',
              }"
            />
          </span>
          <template v-if="row.comparison">
            <span
              aria-hidden="true"
              class="text-end text-xs whitespace-nowrap text-(--p-text-muted-color) tabular-nums"
              :class="{
                [`${BEST_FIT_EMPHASIS} text-(--p-text-color)`]:
                  row.comparison.isBestFit,
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
        </div>
      </template>

      <!--
        Sits in the track column, on the rows from liveLabelGridRow. Absolute,
        so it takes its area from the grid without auto-placement pushing the
        rows aside; pointer-events-none keeps the rows tappable beneath it.
        Both column lines are explicit: an absolute item's auto end line is
        the container's edge, not the next grid line.
      -->
      <div
        v-if="liveLabel"
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 col-start-2 col-end-3"
        data-testid="voice-type-comparison-live-label-area"
        :style="{ gridRow: liveLabelGridRow }"
        dir="ltr"
      >
        <span
          data-testid="voice-type-comparison-live-label"
          :data-side="liveLabel.side"
          class="absolute rounded bg-(--p-content-background) px-1 text-xs whitespace-nowrap tabular-nums transition-[inset-inline-start] duration-75 ease-linear motion-reduce:transition-none"
          :class="[
            liveLabel.side === 'start' ? '-ms-1 -translate-x-full' : 'ms-1',
            /* The subheading's row includes its top margin, so centring would
             * sit above the text. 2px up from the bottom centres the label's
             * 16px line on the heading's 20px line. */
            firstSingerId === null ? 'top-1/2 -translate-y-1/2' : 'bottom-0.5',
          ]"
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
            v-if="rangeBarStyle"
            data-testid="voice-type-comparison-range-bar"
            class="absolute top-1/2 h-2 -translate-y-1/2 rounded-full"
            :style="rangeBarStyle"
          />
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

    <p
      class="text-xs text-(--p-text-muted-color)"
      data-testid="voice-type-comparison-legend"
    >
      <template v-if="range">
        {{ t('voiceRangeFinder.compare.rangeLegend') }}
        {{ t('voiceRangeFinder.compare.reachLegend') }}
      </template>
      <template v-else>
        <!-- Nothing lights up with the toggle off, so say how to turn it on -->
        <template v-if="!isListening">
          {{
            t('generic.turnOnPreview', {
              toggle: t('generic.previewSoundLabel'),
            })
          }}
        </template>
        {{ t('voiceRangeFinder.compare.exploreExplainer') }}
        <template v-if="showSingers">
          {{ t('voiceRangeFinder.compare.famousSingersLegend') }}
          {{ t('voiceRangeFinder.compare.rangeLegend') }}
        </template>
      </template>
      <template v-if="hasBestFit">
        {{ t('voiceRangeFinder.compare.bestFitLegend') }}
      </template>
    </p>
  </div>
</template>

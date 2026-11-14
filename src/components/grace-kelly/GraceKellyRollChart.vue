<script setup lang="ts">
import { useElementSize } from '@vueuse/core'
import {
  CHART_LABEL_BASE,
  CHART_LABEL_GUTTER_WIDTH,
  CHART_LABEL_WIDTH,
} from '@/constants/chartStyles'
import { getGridMidis, midiToChartY } from '@/utils/chartGrid'
import { midiToFrequency, midiToNoteLabel } from '@/utils/noteUtils'
import { textColorAtMidi } from '@/utils/pitchColors'
import { GRACE_KELLY_LYRIC_LINES } from './graceKellyLyrics'
import {
  assignLyricRows,
  eighthToRollX,
  ROLL_COLUMNS,
  ROLL_PADDING_X,
  ROLL_TOTAL_EIGHTHS,
  rollMidiRange,
} from './graceKellyRoll'

type Props = {
  activeNoteIndex: number | null
  /* Flat reading-order index of the syllable being sung, -1 when idle. */
  activeSyllableIndex: number
  startToneMidi: number
  /* Voices to draw, by VOZ_MELODIES index. */
  vozIndices: number[]
}

const props = defineProps<Props>()

const { isDark } = useDarkMode()
const { playTone } = useTonePlayer()

/* Narrowest an eighth note may get. Below this the lyrics collide, so the
 * plot stops shrinking and scrolls sideways instead (phones). */
const MIN_EIGHTH_WIDTH_PX = 20
const MIN_PLOT_WIDTH_PX =
  ROLL_TOTAL_EIGHTHS * MIN_EIGHTH_WIDTH_PX + ROLL_PADDING_X * 2

/* Lyric rows. Words like "could" sit on a single eighth and can be wider than
 * it, so a syllable that would run into the one before drops to a second row. */
const LYRIC_ROW_COUNT = 2
const LYRIC_ROW_HEIGHT_PX = 18
/* Estimated width of one character of the 12px lyric text, and the gap kept
 * between two syllables on a row. An estimate is enough: it only decides
 * which row a syllable goes on. */
const LYRIC_CHARACTER_WIDTH_PX = 6.5
const LYRIC_GAP_PX = 3

const plotRef = ref<HTMLElement | null>(null)
const scrollerRef = ref<HTMLElement | null>(null)
const { width: plotWidth, height: plotHeight } = useElementSize(plotRef)

const midiRange = computed(() => rollMidiRange(props.startToneMidi))

const gridMidis = computed(() =>
  getGridMidis(
    midiRange.value.midiMin,
    midiRange.value.midiMax,
    plotHeight.value,
  ),
)

const axisLabels = computed(() => {
  if (!plotHeight.value) return []

  return gridMidis.value.map((midi) => ({
    midi,
    label: midiToNoteLabel(midi).label,
    y: midiToChartY(midi, {
      midiMin: midiRange.value.midiMin,
      midiMax: midiRange.value.midiMax,
      height: plotHeight.value,
    }),
  }))
})

const syllables = computed(() => {
  const placed = GRACE_KELLY_LYRIC_LINES.flat(2).map((syllable, index) => ({
    index,
    text: syllable.text,
    x: eighthToRollX(
      ROLL_COLUMNS[syllable.noteIndex].startEighth,
      plotWidth.value,
    ),
    width: syllable.text.length * LYRIC_CHARACTER_WIDTH_PX + LYRIC_GAP_PX,
  }))
  const rows = assignLyricRows(placed, LYRIC_ROW_COUNT)

  return placed.map((syllable, index) =>
    Object.assign({}, syllable, { row: rows[index] }),
  )
})

/* On a narrow screen the plot is wider than its scroller: keep the note being
 * sung in the middle. Does nothing when the whole song already fits. */
watch(
  () => props.activeNoteIndex,
  (noteIndex) => {
    const scroller = scrollerRef.value
    if (noteIndex === null || !scroller) return

    if (scroller.scrollWidth <= scroller.clientWidth) return

    const x = eighthToRollX(
      ROLL_COLUMNS[noteIndex].startEighth,
      plotWidth.value,
    )
    scroller.scrollTo({
      left: x - scroller.clientWidth / 2,
      behavior: 'smooth',
    })
  },
)
</script>

<template>
  <!-- Always LTR: time runs left to right like the music sheets, in every
       language. -->
  <div class="flex w-full" dir="ltr" data-testid="grace-kelly-roll-chart">
    <div
      class="relative shrink-0"
      :style="{
        width: `${CHART_LABEL_GUTTER_WIDTH}px`,
        height: `${plotHeight}px`,
      }"
    >
      <button
        v-for="axisLabel in axisLabels"
        :key="axisLabel.midi"
        type="button"
        :class="[CHART_LABEL_BASE, 'chart-label-tinted']"
        :style="{
          top: `${axisLabel.y}px`,
          width: `${CHART_LABEL_WIDTH}px`,
          textAlign: 'end',
          '--label-tint': textColorAtMidi(axisLabel.midi, isDark),
        }"
        :data-testid="`btn-${axisLabel.label}`"
        @click="playTone(midiToFrequency(axisLabel.midi))"
      >
        {{ axisLabel.label }}
      </button>
    </div>

    <div
      ref="scrollerRef"
      class="min-w-0 flex-1 overflow-x-auto overscroll-x-contain"
      data-testid="grace-kelly-roll-scroller"
    >
      <div :style="{ minWidth: `${MIN_PLOT_WIDTH_PX}px` }">
        <div
          ref="plotRef"
          class="relative h-[50vh] max-h-200 min-h-64 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background)"
        >
          <GraceKellyRollCanvas
            :width="plotWidth"
            :height="plotHeight"
            :midiMin="midiRange.midiMin"
            :midiMax="midiRange.midiMax"
            :gridMidis="gridMidis"
            :startToneMidi="startToneMidi"
            :vozIndices="vozIndices"
            :activeNoteIndex="activeNoteIndex"
          />
        </div>
        <div
          class="relative mt-1 text-xs text-(--p-text-muted-color)"
          :style="{ height: `${LYRIC_ROW_COUNT * LYRIC_ROW_HEIGHT_PX}px` }"
          data-testid="grace-kelly-roll-lyrics"
        >
          <span
            v-for="syllable in syllables"
            :key="syllable.index"
            class="absolute whitespace-nowrap transition-colors"
            :class="{
              'font-semibold text-(--p-primary-color)':
                syllable.index === activeSyllableIndex,
            }"
            :style="{
              insetInlineStart: `${syllable.x}px`,
              top: `${syllable.row * LYRIC_ROW_HEIGHT_PX}px`,
            }"
            :data-active="syllable.index === activeSyllableIndex"
          >
            {{ syllable.text }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="css">
/*
 * The tint arrives as an inline custom property rather than an inline colour,
 * so the hover rule can still win (same pattern as PitchHistoryChart).
 */
.chart-label-tinted {
  color: var(--label-tint);
}

.chart-label-tinted:hover {
  color: var(--p-text-color);
}
</style>

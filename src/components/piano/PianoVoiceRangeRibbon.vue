<script setup lang="ts">
import {
  RIBBON_BAR_OPACITY,
  RIBBON_BAR_WIDTH,
  RIBBON_LANE_WIDTH,
} from '@/utils/voiceRangeSegments'
import type { DecoratedVoiceTypeSegment } from '@/composables/useVoiceTypeSegments'
import { pianoPitchXForMidi, type PianoLayout } from './pianoLayout'

type Props = {
  /* The keyboard's own geometry. Positions come from its pitch axis rather than
   * a measured width, so a bar lands on the same x as the key it names however
   * the board is sized, scrolled or centred. */
  layout: PianoLayout
  /* Index into VOICE_RANGES. Picks which voices are drawn, and marks the chosen
   * one when the selection happens to be one of the six types. */
  rangeIndex: number
}

const props = defineProps<Props>()

const { t } = useI18n()

/*
 * A row is the horizontal transpose of the chart ribbon's lane: the bar keeps
 * its RIBBON_BAR_WIDTH thickness inside a RIBBON_LANE_WIDTH band, so a piano
 * bar and a chart bar are the same weight. The rest of the row is the name and
 * note span, which the chart's 5px columns had no room for — a bar here is
 * hundreds of px long, so it can carry its own label instead of hiding it in a
 * hover tooltip.
 */
/* px — one voice type: the label on top, the bar in the lane-thick band below.
 * 20 rather than the 17 the two bands strictly need: at 17 a label sat close
 * enough to the bar above it to read as that bar's caption. */
const RIBBON_ROW_HEIGHT = 20
/* px — the opaque cap that marks a voice's true start or stop note. Length
 * along the pitch axis; it spans the whole lane across it. */
const CAP_LENGTH = 3

const segments = useVoiceTypeSegments(() => ({
  rangeIndex: props.rangeIndex,
  midiMin: props.layout.midiMin,
  midiMax: props.layout.midiMax,
}))

type PositionedSegment = DecoratedVoiceTypeSegment & {
  startX: number
  width: number
  top: number
  /* px the label may run before it would leave the keyboard. A name wider than
   * its own bar is normal — one wider than the board would add scroll width to
   * the keys' scroll box, so it truncates instead. */
  labelMaxWidth: number
}

/*
 * getSegmentsForRange returns the lowest voice first, which is the order the
 * chart ribbon stacks its columns in. A vertical stack of rows reads the other
 * way — see "Vertical Ordering" in AGENTS.md — so Soprano takes the top row and
 * Bass sits nearest the keys, matching the legend.
 */
const positionedSegments = computed<PositionedSegment[]>(() =>
  segments.value.toReversed().map((segment, row) => {
    const startX = pianoPitchXForMidi(props.layout, segment.midiFrom)

    return Object.assign({}, segment, {
      startX,
      width: pianoPitchXForMidi(props.layout, segment.midiTo) - startX,
      top: row * RIBBON_ROW_HEIGHT,
      labelMaxWidth: Math.max(0, props.layout.totalWidth - startX),
    })
  }),
)

const ribbonHeight = computed(
  () => positionedSegments.value.length * RIBBON_ROW_HEIGHT,
)

/*
 * Coverage only ever tells the singer that a voice is short of the range, so
 * the figure is dropped when nothing is short. A voice the range covers whole
 * already has a null coveragePercent, so one non-null figure among the rows is
 * the whole test. Same rule as the legend's percentage column, so the two
 * never disagree.
 */
const hasPartialCoverage = computed(() =>
  positionedSegments.value.some((segment) => segment.coveragePercent != null),
)
</script>

<template>
  <div
    v-if="positionedSegments.length"
    data-testid="piano-voice-range-ribbon"
    role="group"
    :aria-label="t('voiceRanges.groups.voiceTypes')"
    class="relative mx-auto"
    :style="{
      width: `${layout.totalWidth}px`,
      height: `${ribbonHeight}px`,
    }"
  >
    <!--
      Reference material, not a control — the voice range select above the
      keyboard is where a voice gets chosen. role="img" carries the whole row
      (name, span and coverage) as one accessible name, so a screen reader
      hears what the row reads rather than three orphaned fragments.
    -->
    <div
      v-for="segment in positionedSegments"
      :key="segment.labelKey"
      role="img"
      data-testid="piano-voice-range-row"
      :data-voice-type="segment.labelKey"
      :data-clipped-low="segment.isClippedLow"
      :data-clipped-high="segment.isClippedHigh"
      :data-selected="segment.isSelected"
      class="absolute"
      :style="{
        insetInlineStart: `${segment.startX}px`,
        width: `${segment.width}px`,
        top: `${segment.top}px`,
        height: `${RIBBON_ROW_HEIGHT}px`,
      }"
      :title="segment.spanLabel"
      :aria-label="segment.spanLabel"
    >
      <!--
        Anchored to the bar's start rather than centred on it: consecutive
        voices are a fixed interval apart, so left-anchored labels step down
        the board in the same rhythm as the bars themselves. Truncates rather
        than wrapping — a second line would collide with the row below.
      -->
      <span
        aria-hidden="true"
        class="absolute start-0 top-0 flex items-baseline gap-1 overflow-hidden text-[10px] leading-3 whitespace-nowrap"
        :style="{ maxWidth: `${segment.labelMaxWidth}px` }"
      >
        <span
          class="text-(--p-text-color)"
          :class="segment.isSelected && 'font-semibold'"
        >
          {{ segment.name }}
        </span>
        <span class="text-(--p-text-muted-color) tabular-nums">
          {{ segment.noteSpan }}
        </span>
        <span
          v-if="hasPartialCoverage && segment.coveragePercent"
          class="text-(--p-text-muted-color) tabular-nums"
        >
          {{ segment.coveragePercent }}
        </span>
      </span>

      <!--
        The bar sits in the lane-thick band at the row's bottom, so every bar
        is the same distance from the label it belongs to.
      -->
      <span
        aria-hidden="true"
        class="absolute start-0 w-full"
        :class="[
          !segment.isClippedLow && 'rounded-s-full',
          !segment.isClippedHigh && 'rounded-e-full',
        ]"
        :style="{
          bottom: `${(RIBBON_LANE_WIDTH - RIBBON_BAR_WIDTH) / 2}px`,
          height: `${RIBBON_BAR_WIDTH}px`,
          backgroundColor: segment.color,
          opacity: segment.isSelected ? 1 : RIBBON_BAR_OPACITY,
        }"
      />
      <!--
        Full-lane opaque caps at the notes where the voice really starts and
        stops. A clipped end gets none, so a bar running off the keyboard never
        claims a boundary it does not have.
      -->
      <span
        v-if="!segment.isClippedLow"
        aria-hidden="true"
        class="absolute start-0 bottom-0 rounded-full"
        :style="{
          width: `${CAP_LENGTH}px`,
          height: `${RIBBON_LANE_WIDTH}px`,
          backgroundColor: segment.color,
        }"
      />
      <span
        v-if="!segment.isClippedHigh"
        aria-hidden="true"
        class="absolute end-0 bottom-0 rounded-full"
        :style="{
          width: `${CAP_LENGTH}px`,
          height: `${RIBBON_LANE_WIDTH}px`,
          backgroundColor: segment.color,
        }"
      />
    </div>
  </div>
</template>

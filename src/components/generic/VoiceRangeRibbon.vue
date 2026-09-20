<script setup lang="ts">
import { midiToChartY } from '@/utils/chartGrid'
import {
  RIBBON_BAR_OPACITY,
  RIBBON_BAR_WIDTH,
  RIBBON_LANE_WIDTH,
} from '@/utils/voiceRangeSegments'
import type { DecoratedVoiceTypeSegment } from '@/composables/useVoiceTypeSegments'

type Props = {
  /* The span the chart is drawing, which the segments get clamped to. */
  midiMin: number
  midiMax: number
  /* Index into VOICE_RANGES. Used only to mark the chosen voice when the
   * selection happens to be one of the six types; the parent decides whether
   * the ribbon is shown at all. */
  rangeIndex: number
  containerHeight: number
  /* px from the chart's start edge to the first column, leaving the axis
   * labels their own space. */
  insetStart: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectRange: [rangeIndex: number]
}>()

/* px — the opaque cap that marks a voice's true start or stop note. */
const CAP_HEIGHT = 3

const segments = useVoiceTypeSegments(() => ({
  rangeIndex: props.rangeIndex,
  midiMin: props.midiMin,
  midiMax: props.midiMax,
}))

type PositionedSegment = DecoratedVoiceTypeSegment & {
  top: number
  height: number
}

const positionedSegments = computed<PositionedSegment[]>(() => {
  if (!props.containerHeight) return []

  const scale = {
    midiMin: props.midiMin,
    midiMax: props.midiMax,
    height: props.containerHeight,
  }

  return segments.value.map((segment) => {
    const top = midiToChartY(segment.midiTo, scale)

    return Object.assign({}, segment, {
      top,
      height: midiToChartY(segment.midiFrom, scale) - top,
    })
  })
})
</script>

<template>
  <div
    v-if="positionedSegments.length"
    data-testid="voice-range-ribbon"
    class="pointer-events-none absolute top-0 h-full"
    :style="{ insetInlineStart: `${props.insetStart}px` }"
  >
    <button
      v-for="segment in positionedSegments"
      :key="segment.labelKey"
      type="button"
      data-testid="voice-range-segment"
      :data-voice-type="segment.labelKey"
      :data-clipped-low="segment.isClippedLow"
      :data-clipped-high="segment.isClippedHigh"
      :data-selected="segment.isSelected"
      class="group pointer-events-auto absolute cursor-pointer border-none bg-transparent p-0"
      :style="{
        insetInlineStart: `${segment.lane * RIBBON_LANE_WIDTH}px`,
        width: `${RIBBON_LANE_WIDTH}px`,
        top: `${segment.top}px`,
        height: `${segment.height}px`,
      }"
      :title="segment.spanLabel"
      :aria-label="segment.spanLabel"
      @click="emit('selectRange', segment.rangeIndex)"
    >
      <span
        aria-hidden="true"
        class="absolute top-0 h-full transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        :class="[
          !segment.isClippedHigh && 'rounded-t-full',
          !segment.isClippedLow && 'rounded-b-full',
        ]"
        :style="{
          insetInlineStart: `${(RIBBON_LANE_WIDTH - RIBBON_BAR_WIDTH) / 2}px`,
          width: `${RIBBON_BAR_WIDTH}px`,
          backgroundColor: segment.color,
          opacity: segment.isSelected ? 1 : RIBBON_BAR_OPACITY,
        }"
      />
      <!--
        Full-width opaque caps at the notes where the voice really starts and
        stops. A clipped end gets none, so a bar running off the chart never
        claims a boundary it does not have.
      -->
      <span
        v-if="!segment.isClippedHigh"
        aria-hidden="true"
        class="absolute start-0 top-0 w-full rounded-full"
        :style="{ height: `${CAP_HEIGHT}px`, backgroundColor: segment.color }"
      />
      <span
        v-if="!segment.isClippedLow"
        aria-hidden="true"
        class="absolute start-0 bottom-0 w-full rounded-full"
        :style="{ height: `${CAP_HEIGHT}px`, backgroundColor: segment.color }"
      />
      <span
        aria-hidden="true"
        class="pointer-events-none absolute start-full top-1/2 z-10 ms-2 -translate-y-1/2 rounded border border-(--p-content-border-color) bg-(--p-content-background) px-1.5 py-0.5 text-xs whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        :style="{ color: segment.color }"
      >
        {{ segment.spanLabel }}
      </span>
    </button>
  </div>
</template>

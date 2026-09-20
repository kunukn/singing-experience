<script setup lang="ts">
import { RIBBON_BAR_OPACITY } from '@/utils/voiceRangeSegments'

type Props = {
  /* The span the chart is drawing — the same pair the ribbon clamps to, so the
   * key lists exactly the bars that are on screen. */
  midiMin: number
  midiMax: number
  /* Index into VOICE_RANGES, used to mark the chosen voice and to report which
   * range a clicked row asks for. */
  rangeIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectRange: [rangeIndex: number]
}>()

const { t } = useI18n()

/* px — wider than the chart's 3px bars: with no axis beside it to give it
 * scale, a hairline reads as a divider rather than a colour sample. */
const SWATCH_WIDTH = 5

const segments = useVoiceTypeSegments(() => ({
  rangeIndex: props.rangeIndex,
  midiMin: props.midiMin,
  midiMax: props.midiMax,
}))

/* getSegmentsForRange returns the lowest voice first, the order the ribbon
 * stacks its columns in. A vertical list reads the other way — see "Vertical
 * Ordering" in AGENTS.md — so Soprano sits on top, as it does on the chart. */
const rows = computed(() => segments.value.toReversed())
</script>

<template>
  <ul
    v-if="rows.length"
    data-testid="voice-range-legend"
    :aria-label="t('voiceRanges.groups.voiceTypes')"
    class="flex flex-col gap-1"
  >
    <li v-for="row in rows" :key="row.labelKey">
      <button
        type="button"
        data-testid="voice-range-legend-row"
        :data-voice-type="row.labelKey"
        :data-clipped-low="row.isClippedLow"
        :data-clipped-high="row.isClippedHigh"
        :data-selected="row.isSelected"
        :aria-current="row.isSelected ? 'true' : undefined"
        class="flex h-5 w-full cursor-pointer items-center gap-2 rounded border-none bg-transparent p-0 text-start"
        :aria-label="row.spanLabel"
        @click="emit('selectRange', row.rangeIndex)"
      >
        <!--
          The bar in miniature, down to the flat end a clipped voice gets: the
          key repeats the chart's rule that a bar running off screen never
          claims a boundary it does not have.
        -->
        <span
          aria-hidden="true"
          class="h-full shrink-0"
          :class="[
            !row.isClippedHigh && 'rounded-t-full',
            !row.isClippedLow && 'rounded-b-full',
          ]"
          :style="{
            width: `${SWATCH_WIDTH}px`,
            backgroundColor: row.color,
            opacity: row.isSelected ? 1 : RIBBON_BAR_OPACITY,
          }"
        />
        <!--
          Both spans refuse to wrap: the list sizes itself to its longest row,
          and a name breaking over two lines (Mezzo-Soprano, Меццо-сопрано)
          would throw every swatch out of line with its neighbours.
        -->
        <span
          aria-hidden="true"
          class="text-xs whitespace-nowrap"
          :class="
            row.isSelected
              ? 'font-semibold text-(--p-text-color)'
              : 'text-(--p-text-color)'
          "
        >
          {{ row.name }}
        </span>
        <!--
          Dropped below md, where the key and the centred controls are
          competing for the same 158px and the names alone need 108. The bar
          on the chart already shows a voice's extent, and the full
          "Soprano, C4–C6" stays in the row's accessible name either way.
        -->
        <span
          aria-hidden="true"
          class="ms-auto hidden text-xs whitespace-nowrap text-(--p-text-muted-color) tabular-nums md:inline"
        >
          {{ row.noteSpan }}
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped lang="css"></style>

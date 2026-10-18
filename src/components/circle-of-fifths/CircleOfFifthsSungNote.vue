<script setup lang="ts">
import type { SungState } from './useCircleOfFifthsGame'

const { sungState } = defineProps<{
  sungLabel: string | null
  /* null = nothing to compare against, shown in a neutral colour */
  sungState: SungState | null
  /* From the note shown, coloured by how clean it is — the note's own colour
   * only says right or wrong */
  sungCents: number | null
  showTooLow: boolean
  showTooHigh: boolean
}>()

const { t } = useI18n()

/* Same colours as the too-low / too-high hint arrows beside it */
const SUNG_COLOR: Record<SungState, string> = {
  correct: 'text-(--p-green-500)',
  low: 'text-(--p-orange-400)',
  high: 'text-(--p-blue-400)',
}

const sungColor = computed(() =>
  sungState ? SUNG_COLOR[sungState] : 'text-(--p-text-muted-color)',
)
</script>

<template>
  <!-- 1fr | label | 1fr: the label sits on the centre line, with the hint
    arrow and 🎤 on one side and the cents and their meter on the other, so
    nothing shifts as
    the label, the cents or the arrow change. The arrow sits on the 🎤 side,
    away from the cents: it points at the target, the cents measure the
    singer's own note, and side by side the two could read as one. -->
  <div
    class="grid w-full grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-[0.6cqi] text-[3.6cqi] font-semibold tabular-nums transition-colors"
    :class="sungColor"
    data-testid="circle-target-sung"
    :data-state="sungState ?? 'none'"
    :title="t('circleOfFifths.youAreSinging')"
  >
    <div class="flex items-center gap-x-[0.6cqi] justify-self-end">
      <div class="grid w-[4cqi] place-items-center">
        <span
          class="col-start-1 row-start-1"
          :class="
            showTooLow ? 'animate-bounce text-(--p-orange-400)' : 'invisible'
          "
          :aria-label="t('generic.tooLow')"
          data-testid="circle-target-too-low"
          :data-visible="showTooLow"
        >
          <ArrowUpIcon class="size-[3.6cqi]" />
        </span>
        <span
          class="col-start-1 row-start-1"
          :class="
            showTooHigh ? 'animate-bounce text-(--p-blue-400)' : 'invisible'
          "
          :aria-label="t('generic.tooHigh')"
          data-testid="circle-target-too-high"
          :data-visible="showTooHigh"
        >
          <ArrowUpIcon class="size-[3.6cqi] rotate-180" />
        </span>
      </div>
      <span aria-hidden="true">🎤</span>
    </div>
    <!-- Fixed width, sized for the widest label (D♭5) -->
    <span class="w-[2em] text-center whitespace-nowrap">{{
      sungLabel ?? '–'
    }}</span>
    <!-- Meter first, right beside the fixed-width label, so it sits near the
      hub's centre instead of out by the ring. The cents follow it at a fixed
      width, sized for the widest reading (−70¢). The wrapper carries the
      alignment: CentsLabel is dir="ltr", so its own start never flips in RTL -->
    <div class="flex items-center gap-x-[1.2cqi] justify-self-start">
      <CentsMeter :cents="sungLabel === null ? null : sungCents" />
      <span class="min-w-[3.2em] text-start">
        <CentsLabel
          :cents="sungLabel === null ? null : sungCents"
          data-testid="circle-target-cents"
        />
      </span>
    </div>
  </div>
</template>

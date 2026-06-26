<script setup lang="ts">
import { useMediaQuery } from '@vueuse/core'
import { VOZ_LABEL_KEYS } from './graceKellyConstants'

type Props = {
  /* True while a sequence plays or is paused — the toggles lock so the running
   * timeline can't change underneath it. */
  isRunning: boolean
}

const props = defineProps<Props>()

/* Voices to play and show, by VOZ_MELODIES index, kept sorted ascending. */
const selectedVozIndices = defineModel<number[]>('selectedVozIndices', {
  required: true,
})

const { t } = useI18n()

/* < 800px tall → horizontal scroller (see styles). Drives both the layout (the
 * .short class) and the row order from one breakpoint so the two can't drift. */
const isShortViewport = useMediaQuery('(max-height: 799px)')

const partRows = computed(() => {
  /* Natural index order is Melody (0) … Low (5). The vertical stack keeps this so
   * it reads top→bottom like the stacked sheets below. The horizontal row reverses
   * to Low … Melody so it reads low→high left→right. */
  const rows = VOZ_LABEL_KEYS.map((key, index) => ({
    index,
    label: t(`graceKelly.vozLabels.${key}`),
  }))

  return isShortViewport.value ? rows.toReversed() : rows
})

function isSelected(index: number) {
  return selectedVozIndices.value.includes(index)
}

function toggle(index: number, enabled: boolean) {
  const next = enabled
    ? [...selectedVozIndices.value, index]
    : selectedVozIndices.value.filter((value) => value !== index)

  selectedVozIndices.value = [...new Set(next)].sort((a, b) => a - b)
}

/* On short viewports the stack collapses into a horizontal snap-scroller (see
 * styles); track scroll position so the edge fade shows only on the side(s) with
 * hidden content. No-op in the tall vertical layout (no horizontal overflow). */
const rootRef = ref<HTMLElement | null>(null)
const { canScrollStart, canScrollEnd } = useScrollEdgeMask(rootRef)
</script>

<template>
  <div
    ref="rootRef"
    class="ladder"
    :class="{
      short: isShortViewport,
      'mask-start': canScrollStart,
      'mask-end': canScrollEnd,
    }"
  >
    <label
      v-for="part in partRows"
      :key="part.index"
      class="ladder-row"
      :class="{ selected: isSelected(part.index), disabled: props.isRunning }"
    >
      <PrimeToggleSwitch
        :modelValue="isSelected(part.index)"
        :disabled="props.isRunning"
        @update:modelValue="(value: boolean) => toggle(part.index, value)"
      />
      <span class="flex-1 text-start">{{ part.label }}</span>
    </label>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* Tall viewports: a centered vertical stack. */
.ladder {
  @apply mx-auto flex w-full max-w-90 flex-col bg-gray-50;
}

.ladder-row {
  @apply flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm;
  @apply text-(--p-text-muted-color) transition-colors;
}

/* Selected rows light up: a faint primary tint and full-strength text so the
 * chosen voices stand out from the dimmed, unselected ones. */
.ladder-row.selected {
  @apply text-(--p-text-color);
}

.ladder-row.disabled {
  @apply cursor-not-allowed opacity-60;
}

/* Short viewports (< 800px tall, toggled via the `short` class): collapse the
 * 6-row stack into a single horizontal snap-scroller so the parts don't eat the
 * limited vertical space. Same affordance as .settings-row / EdgeFadeScroller. */
.ladder.short {
  @apply w-auto max-w-full snap-x snap-mandatory flex-row items-center justify-center-safe gap-2 overflow-x-auto px-6;
  /* Align snap stops with the 1.5rem fade gutter below. */
  scroll-padding-inline: 1.5rem;
}

.ladder.short .ladder-row {
  @apply shrink-0 snap-start;
}

/* Edge fade on whichever side has hidden content (mirrors EdgeFadeScroller). */
.ladder.short.mask-start.mask-end {
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 1.5rem,
    black calc(100% - 1.5rem),
    transparent 100%
  );
}

.ladder.short.mask-start:not(.mask-end) {
  mask-image: linear-gradient(to right, transparent 0, black 1.5rem);
}

.ladder.short.mask-end:not(.mask-start) {
  mask-image: linear-gradient(
    to right,
    black calc(100% - 1.5rem),
    transparent 100%
  );
}
</style>

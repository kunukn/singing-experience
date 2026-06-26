<script setup lang="ts">
/* Horizontally scrollable row with an edge fade on whichever side has hidden
 * content — signals scrollability where scrollbars auto-hide (iOS). Children
 * keep their size (no shrink) so the row overflows instead of squishing.
 * Layout (flex/gap/align/justify) is supplied by the consumer via `class`. */
const rootRef = ref<HTMLElement | null>(null)
const { canScrollStart, canScrollEnd } = useScrollEdgeMask(rootRef)
</script>

<template>
  <div
    ref="rootRef"
    class="edge-fade-scroller"
    :class="{ 'mask-start': canScrollStart, 'mask-end': canScrollEnd }"
  >
    <slot />
  </div>
</template>

<style scoped lang="css">
.edge-fade-scroller {
  overflow-x: auto;
  /* Gutter so the first/last item isn't hidden under the fade; matches the
   * 1.5rem mask width below. */
  padding-inline: 1.5rem;
  scroll-padding-inline: 1.5rem;
}

/* :deep — slotted children carry the parent's scope id, so the child combinator
 * must pierce scoping to reach them. */
.edge-fade-scroller > :deep(*) {
  flex-shrink: 0;
}

.edge-fade-scroller.mask-start.mask-end {
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 1.5rem,
    black calc(100% - 1.5rem),
    transparent 100%
  );
}

.edge-fade-scroller.mask-start:not(.mask-end) {
  mask-image: linear-gradient(to right, transparent 0, black 1.5rem);
}

.edge-fade-scroller.mask-end:not(.mask-start) {
  mask-image: linear-gradient(
    to right,
    black calc(100% - 1.5rem),
    transparent 100%
  );
}
</style>

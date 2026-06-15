<script setup lang="ts">
/*
 * Translucent box highlighting the active note's bar. Explicit stacking
 * (z-0 here, z-10 on the SVG, z-20 on the label) keeps it behind the
 * noteheads but above the card — a negative z-index would hide it behind
 * an opaque ancestor. Lives in content coordinates so it scrolls with the
 * staff. Single source of truth for the highlight color/opacity.
 */
type BarPosition = { left: number; width: number }

const { position, show = true } = defineProps<{
  position: BarPosition | null
  show?: boolean
}>()
</script>

<template>
  <div
    v-if="position && show"
    class="pointer-events-none absolute top-14 bottom-9 z-0 rounded bg-(--p-surface-500)/5 transition-all duration-150"
    :style="{
      left: `${position.left}px`,
      width: `${position.width}px`,
    }"
  />
</template>

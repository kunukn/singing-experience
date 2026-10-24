<script setup lang="ts">
/*
 * Shared frame for every program icon: a 40×40 rounded tile tinted with the
 * program's hue. Glyphs draw with the tokens below so the whole set shares one
 * palette and follows light/dark mode:
 *   --icon-strong  main glyph colour (hue 600 light / 400 dark)
 *   --icon-accent  optional second hue for one small detail
 *   --icon-light   near-white highlight (white keys, eyes, dial faces)
 */
type ProgramIconHue =
  | 'emerald'
  | 'teal'
  | 'blue'
  | 'sky'
  | 'purple'
  | 'rose'
  | 'orange'
  | 'amber'
  | 'yellow'

const props = defineProps<{
  hue: ProgramIconHue
  accentHue?: ProgramIconHue
}>()

const hueStyle = computed(() => {
  const accentHue = props.accentHue ?? props.hue

  return {
    '--icon-strong-light': `var(--p-${props.hue}-600)`,
    '--icon-strong-dark': `var(--p-${props.hue}-400)`,
    '--icon-accent-light': `var(--p-${accentHue}-500)`,
    '--icon-accent-dark': `var(--p-${accentHue}-400)`,
  }
})
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 40 40"
    fill="none"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class="program-icon"
    :style="hueStyle"
  >
    <rect
      x="1"
      y="1"
      width="38"
      height="38"
      rx="10"
      class="program-icon-tile"
    />
    <slot />
  </svg>
</template>

<style lang="css">
.program-icon {
  --icon-strong: var(--icon-strong-light);
  --icon-accent: var(--icon-accent-light);
  --icon-light: var(--p-surface-0);
}

.p-dark .program-icon {
  --icon-strong: var(--icon-strong-dark);
  --icon-accent: var(--icon-accent-dark);
  /* Stays light in dark mode so white keys and eyes don't invert */
  --icon-light: var(--p-surface-100);
}

.program-icon-tile {
  /* 16% keeps the tile a soft wash behind the glyph on both card backgrounds */
  fill: color-mix(in srgb, var(--icon-strong) 16%, transparent);
}
</style>

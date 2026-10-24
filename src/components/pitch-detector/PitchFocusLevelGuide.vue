<script setup lang="ts">
import type { FocusLevel } from './focusLevel'
import PitchFocusLevelLadder from './PitchFocusLevelLadder.vue'

type Props = {
  level: FocusLevel | null
}

defineProps<Props>()

const { t } = useI18n()

const popover = ref<{ toggle: (event: Event) => void }>()

function togglePopover(event: Event) {
  popover.value?.toggle(event)
}
</script>

<template>
  <div>
    <!-- Keeps the global 35px control floor so the rounded hover stays a
         circle. PrimeVue's unlayered `.pi` font-size beats text-* utilities,
         so the icon is sized via the token, as the settings cog is. -->
    <PrimeButton
      severity="secondary"
      text
      rounded
      icon="pi pi-question-circle"
      class="[--p-icon-size:1.25rem]"
      :aria-label="t('pitchDetector.focus.guide.title')"
      data-testid="focus-level-guide"
      @click="togglePopover"
    />

    <PrimePopover ref="popover" class="focus-level-guide-popover">
      <div class="w-72 max-w-full">
        <PitchFocusLevelLadder :level="level" />
      </div>
    </PrimePopover>
  </div>
</template>

<style scoped>
/* Keeps a gutter on a phone; PrimeVue otherwise pins it flush to the edge */
:global(.focus-level-guide-popover) {
  max-width: calc(100vw - 2rem);
}

/*
 * Fade in without PrimeVue's scale-in. PrimeVue places the arrow from the
 * popover's measured left edge while the enter animation still has it at
 * scale(0.93) around its centre; at the row's end the popover is shifted to
 * fit, so that shrunken edge put the arrow ~11px off the button's centre.
 */
:global(.focus-level-guide-popover.p-anchored-overlay-enter-active) {
  animation-name: focus-level-guide-fade-in;
}

@keyframes focus-level-guide-fade-in {
  from {
    opacity: 0;
  }
}
</style>

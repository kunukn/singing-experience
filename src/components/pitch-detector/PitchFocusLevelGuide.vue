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
</style>

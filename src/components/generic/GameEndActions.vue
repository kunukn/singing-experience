<script setup lang="ts">
/* End-of-game CTAs shared by every game whose end screen hides the settings.
 * "Play again" always restarts with the same settings; "Settings" goes back to
 * the start screen. Extra controls (e.g. toggles) go in the default slot. */
const emit = defineEmits<{
  playAgain: []
  settings: []
}>()

const { t } = useI18n()
</script>

<template>
  <div class="flex flex-wrap items-center justify-center gap-2">
    <PrimeButton
      class="min-w-20"
      severity="success"
      size="small"
      rounded
      :label="t('generic.playAgain')"
      data-testid="game-play-again"
      @click="emit('playAgain')"
    />
    <PrimeButton
      class="min-w-20"
      severity="secondary"
      size="small"
      rounded
      icon="pi pi-sliders-h"
      :label="t('generic.settings')"
      data-testid="game-settings"
      @click="emit('settings')"
    />
    <slot />
  </div>
</template>

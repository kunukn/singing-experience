<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { TONE_MODE_ICONS } from './toneModeIcons'

/* Outline icon for a tone sound in currentColor — sized by class (e.g. size-5) */
defineProps<{ mode: ToneMode }>()
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="TONE_MODE_ICONS[mode]" />
  </svg>
</template>

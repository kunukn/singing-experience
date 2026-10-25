<script setup lang="ts">
import { NOTE_HEADS, NOTE_STEMS_BEAM_PATH } from './noteMark'

/* Brand-mark notes without the tile, in currentColor — sized by class (e.g. size-5) */
</script>

<template>
  <!-- viewBox is a square crop of the 40×40 noteMark grid around the notes -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="7 7.3 26 26"
    fill="currentColor"
    aria-hidden="true"
  >
    <ellipse v-for="head in NOTE_HEADS" :key="head.cx" v-bind="head" />
    <path :d="NOTE_STEMS_BEAM_PATH" />
  </svg>
</template>

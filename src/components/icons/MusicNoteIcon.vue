<script setup lang="ts">
import type { ProgramIconHue } from '@/components/icons/program/programIconHue'
import { NOTE_HEADS, NOTE_STEMS_BEAM_PATH } from './noteMark'

/* Brand mark: beamed notes on the program-icon tile; hue shows mic permission */
withDefaults(defineProps<{ hue?: ProgramIconHue }>(), { hue: 'surface' })
</script>

<template>
  <ProgramIconTile :hue="hue">
    <ellipse
      v-for="head in NOTE_HEADS"
      :key="head.cx"
      v-bind="head"
      fill="var(--icon-strong)"
    />
    <path :d="NOTE_STEMS_BEAM_PATH" fill="var(--icon-strong)" />
  </ProgramIconTile>
</template>

<script setup lang="ts">
import type { ProgramIconHue } from '@/components/icons/program/programIconHue'
import {
  VOICE_HEAD,
  VOICE_SHOULDERS_PATH,
  VOICE_WAVES,
  VOICE_WAVE_STROKE_WIDTH,
} from './voiceMark'

/* Brand mark: a singer with sound waves on the program-icon tile; hue shows mic permission */
withDefaults(defineProps<{ hue?: ProgramIconHue }>(), { hue: 'surface' })
</script>

<template>
  <ProgramIconTile :hue="hue">
    <circle v-bind="VOICE_HEAD" fill="var(--icon-strong)" />
    <path :d="VOICE_SHOULDERS_PATH" fill="var(--icon-strong)" />
    <path
      v-for="wave in VOICE_WAVES"
      :key="wave.d"
      :d="wave.d"
      :opacity="wave.opacity"
      :stroke-width="VOICE_WAVE_STROKE_WIDTH"
      stroke="var(--icon-strong)"
    />
  </ProgramIconTile>
</template>

<script setup lang="ts">
import type { ProgramIconHue } from '@/components/icons/program/programIconHue'

/* Brand mark: beamed notes on the program-icon tile; hue shows mic permission */
withDefaults(defineProps<{ hue?: ProgramIconHue }>(), { hue: 'surface' })
</script>

<template>
  <!-- Geometry is copied into the favicons (useFaviconPermissionColor.ts, public/icons/note.svg) -->
  <ProgramIconTile :hue="hue">
    <ellipse
      cx="13.5"
      cy="29.5"
      rx="4"
      ry="3"
      transform="rotate(-20 13.5 29.5)"
      fill="var(--icon-strong)"
    />
    <ellipse
      cx="26.5"
      cy="26.5"
      rx="4"
      ry="3"
      transform="rotate(-20 26.5 26.5)"
      fill="var(--icon-strong)"
    />
    <path
      d="M17 29V13M30 26V10"
      stroke="var(--icon-strong)"
      stroke-width="2.5"
    />
    <path
      d="M15.75 13.3 31.25 9.7"
      stroke="var(--icon-strong)"
      stroke-width="4.5"
      stroke-linecap="butt"
    />
  </ProgramIconTile>
</template>

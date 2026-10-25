<script setup lang="ts">
/* Brand-mark notes without the tile, in currentColor — sized by class (e.g. size-5) */
</script>

<template>
  <!-- Geometry from MusicNoteIcon.vue; viewBox is a square crop of its 40×40 grid around the notes -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="7.7 7 26 26"
    fill="none"
    aria-hidden="true"
  >
    <ellipse
      cx="13.5"
      cy="29.5"
      rx="4"
      ry="3"
      transform="rotate(-20 13.5 29.5)"
      fill="currentColor"
    />
    <ellipse
      cx="26.5"
      cy="26.5"
      rx="4"
      ry="3"
      transform="rotate(-20 26.5 26.5)"
      fill="currentColor"
    />
    <path d="M17 29V13M30 26V10" stroke="currentColor" stroke-width="2.5" />
    <path d="M15.75 13.3 31.25 9.7" stroke="currentColor" stroke-width="4.5" />
  </svg>
</template>

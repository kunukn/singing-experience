<script setup lang="ts">
import type { ClefKey } from '@/components/notes/notesConstants'

/*
 * Clef-symbol content for a treble/bass PrimeSelectButton option. The symbol
 * keeps the toggle narrow in every language. The label stays as tooltip and
 * screen-reader text, because SelectButton gives its buttons no aria-label
 * once the option slot replaces the text.
 */
defineProps<{
  clef: ClefKey
  label: string
}>()
</script>

<template>
  <span :title="label" class="flex h-6 items-center px-2">
    <ClefIcon :clef="clef" />
    <span class="sr-only">{{ label }}</span>
  </span>
</template>

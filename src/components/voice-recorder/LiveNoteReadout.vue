<script setup lang="ts">
import { midiToNoteLabel, type NoteInfo } from '@/utils/noteUtils'

const { noteInfo } = defineProps<{
  noteInfo: NoteInfo | null
}>()

const label = computed(() =>
  noteInfo ? midiToNoteLabel(noteInfo.midiNote).label : null,
)
const cents = computed(() => noteInfo?.cents ?? null)
</script>

<template>
  <!-- Fixed widths, sized for the widest note (D♯5) and reading (−50¢), so
    nothing shifts as the note changes or the singer takes a breath -->
  <div
    class="flex items-center justify-center gap-2 text-2xl font-semibold tabular-nums"
    data-testid="live-note"
  >
    <span
      class="w-[2em] text-center whitespace-nowrap"
      :class="{ 'text-(--p-text-muted-color)': label === null }"
      data-testid="live-note-label"
      >{{ label ?? '–' }}</span
    >
    <CentsMeter :cents="cents" />
    <span class="min-w-[3.2em] text-start">
      <CentsLabel :cents="cents" data-testid="live-note-cents" />
    </span>
  </div>
</template>

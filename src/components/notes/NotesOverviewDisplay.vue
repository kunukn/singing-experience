<script setup lang="ts">
import NotesSheet from './NotesSheet.vue'
import { DEFAULT_BPM } from './notesConstants'
import { NOTE_SCALES } from './notesScales'

const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const { t } = useI18n()
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="notes-overview-display"
  >
    <label class="flex items-center gap-2 text-sm sm:mb-2">
      <PrimeToggleSwitch v-model="areToneLabelsShown" />
      {{ t('notes.toneLabels') }}
    </label>

    <!--
      Both reference sheets, always shown: NOTE_SCALES is ordered treble (G clef)
      then bass, so the v-for stacks G clef on top and bass below. Static display —
      no active highlight, bar box, or tempo marking.
    -->
    <div class="flex w-full max-w-full flex-col gap-4">
      <NotesSheet
        v-for="scale in NOTE_SCALES"
        :key="scale.clef"
        :midis="scale.midis"
        :clef="scale.clef"
        :bpm="DEFAULT_BPM"
        :activeNoteIndex="null"
        :showToneLabels="areToneLabelsShown"
        :showBarHighlight="false"
        :showTempo="false"
      />
    </div>
  </div>
</template>

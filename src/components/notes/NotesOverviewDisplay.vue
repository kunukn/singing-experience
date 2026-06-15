<script setup lang="ts">
import NotesOverviewSheet from './NotesOverviewSheet.vue'
import { DEFAULT_BPM } from './notesConstants'
import { NOTE_SCALES } from './notesScales'

/* NOTE_SCALES is ordered treble (V:1) then bass (V:2). */
const trebleMidis = NOTE_SCALES[0]?.midis ?? []
const bassMidis = NOTE_SCALES[1]?.midis ?? []

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
      Combined two-voice reference sheet: treble (G clef) over bass, rendered as a
      single abcjs system so the barlines and beats align column-for-column across
      both staves. Static display — no active highlight or tempo marking.
    -->
    <div class="flex w-full max-w-full flex-col">
      <NotesOverviewSheet
        :trebleMidis="trebleMidis"
        :bassMidis="bassMidis"
        :bpm="DEFAULT_BPM"
        :showToneLabels="areToneLabelsShown"
      />
    </div>
  </div>
</template>

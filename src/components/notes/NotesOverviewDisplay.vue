<script setup lang="ts">
import NotesOutlierSheet from './NotesOutlierSheet.vue'
import NotesOverviewSheet from './NotesOverviewSheet.vue'
import { DEFAULT_BPM } from './notesConstants'
import { NOTE_SCALES, OUTLIER_SCALES } from './notesScales'

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
    <label class="flex items-center gap-2 text-sm">
      <PrimeToggleSwitch v-model="areToneLabelsShown" />
      {{ t('notes.toneLabels') }}
    </label>
    <div class="flex flex-col items-center justify-around gap-1">
      <p class="text-center text-xs text-(--p-text-muted-color)">
        {{ t('notes.clefLabels.treble') }}
      </p>

      <p class="text-center text-xs text-(--p-text-muted-color)">
        {{ t('notes.clefLabels.bass') }}
      </p>
    </div>

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

    <!--
      Beyond-the-staff reference: per-clef sheets showing the ledger-line notehead
      placements outside the basic covered range (a low cluster and a high cluster,
      separated by a gap). Boundary notes repeat as orientation anchors.
    -->
    <div class="flex w-full max-w-full flex-col gap-3">
      <h3 class="text-center text-sm font-semibold text-(--p-text-muted-color)">
        {{ t('notes.outliers.heading') }}
      </h3>

      <NotesOutlierSheet
        :trebleLowMidis="OUTLIER_SCALES.treble.low"
        :trebleHighMidis="OUTLIER_SCALES.treble.high"
        :bassLowMidis="OUTLIER_SCALES.bass.low"
        :bassHighMidis="OUTLIER_SCALES.bass.high"
        :showToneLabels="areToneLabelsShown"
      />
    </div>
  </div>
</template>

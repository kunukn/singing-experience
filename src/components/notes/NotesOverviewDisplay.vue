<script setup lang="ts">
import NotesOutlierSheet from './NotesOutlierSheet.vue'
import NotesOverviewSheet from './NotesOverviewSheet.vue'
import { DEFAULT_BPM } from './notesConstants'
import { filterAccidentals, NOTE_SCALES, OUTLIER_SCALES } from './notesScales'

const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const includeAccidentals = defineModel<boolean>('includeAccidentals', {
  required: true,
})

/* NOTE_SCALES is ordered treble (V:1) then bass (V:2). Naturals only unless the
 * "Sharps & flats" toggle includes the accidental notes. */
const trebleMidis = computed(() =>
  filterAccidentals(NOTE_SCALES[0]?.midis ?? [], includeAccidentals.value),
)
const bassMidis = computed(() =>
  filterAccidentals(NOTE_SCALES[1]?.midis ?? [], includeAccidentals.value),
)

const trebleLowMidis = computed(() =>
  filterAccidentals(OUTLIER_SCALES.treble.low, includeAccidentals.value),
)
const trebleHighMidis = computed(() =>
  filterAccidentals(OUTLIER_SCALES.treble.high, includeAccidentals.value),
)
const bassLowMidis = computed(() =>
  filterAccidentals(OUTLIER_SCALES.bass.low, includeAccidentals.value),
)
const bassHighMidis = computed(() =>
  filterAccidentals(OUTLIER_SCALES.bass.high, includeAccidentals.value),
)

const { t } = useI18n()
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="notes-overview-display"
  >
    <div class="flex items-center gap-2">
      <ToggleIconButton
        v-model="areToneLabelsShown"
        iconOn="pi pi-tag"
        iconOff="pi pi-tag"
        :label="t('notes.toneLabels')"
      />
      <ToggleIconButton
        v-model="includeAccidentals"
        iconOn="pi pi-hashtag"
        iconOff="pi pi-hashtag"
        :label="t('notes.accidentals')"
      />
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
        :trebleLowMidis="trebleLowMidis"
        :trebleHighMidis="trebleHighMidis"
        :bassLowMidis="bassLowMidis"
        :bassHighMidis="bassHighMidis"
        :showToneLabels="areToneLabelsShown"
      />
    </div>
  </div>
</template>

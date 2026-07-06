<script setup lang="ts">
import { frequencyToMidi } from '@/utils/noteUtils'
import { useStableSungLabel } from '@/components/grace-kelly/useStableSungLabel'
import NotesOutlierSheet from './NotesOutlierSheet.vue'
import NotesOverviewSheet from './NotesOverviewSheet.vue'
import { DEFAULT_BPM } from './notesConstants'
import { filterAccidentals, NOTE_SCALES, OUTLIER_SCALES } from './notesScales'

type Props = {
  /* True only while the "Overview" tab is active. PrimeTabs keeps every panel
   * mounted, so the idle preview mic is gated on this to avoid competing with
   * the "Listen" tab's mic on a hidden tab. */
  isActive: boolean
}

const props = defineProps<Props>()

const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const includeAccidentals = defineModel<boolean>('includeAccidentals', {
  required: true,
})

const areNoteNumbersShown = defineModel<boolean>('areNoteNumbersShown', {
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

const { isPreviewEnabled } = useSettings()

/* "See your voice" idle preview — listens only while this tab is active, so it
 * never competes with the "Listen" tab's mic on the (still-mounted) hidden
 * panel. */
const {
  previewMidi,
  rawFrequency: previewFrequency,
  micPermission,
} = useIdlePreview({
  isGameActive: computed(() => !props.isActive),
  isEnabled: isPreviewEnabled,
})

/* Continuous MIDI of the previewed pitch (raw, not rounded), for the pitch line's
 * vertical position; null when no clean pitch is detected. */
const sungMidi = computed(() => {
  if (previewMidi.value === null || previewFrequency.value === null) return null

  return frequencyToMidi(previewFrequency.value)
})

const { stableSungLabel, stableSungCents } = useStableSungLabel({
  sungMidi,
  showOctave: areNoteNumbersShown,
})

/* Each sheet reports its natural SVG width; the wider one's width becomes the
 * shared `min-width` for both cards so their borders align. Only applied once both
 * have reported to avoid an initial layout jump from a stale zero. */
const overviewNaturalWidth = ref(0)
const outlierNaturalWidth = ref(0)

const sharedCardWidth = computed(() =>
  overviewNaturalWidth.value > 0 && outlierNaturalWidth.value > 0
    ? Math.max(overviewNaturalWidth.value, outlierNaturalWidth.value)
    : undefined,
)
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
      <ToggleIconButton
        v-model="areNoteNumbersShown"
        iconOn="pi pi-sort-numeric-up"
        iconOff="pi pi-sort-numeric-up"
        :label="t('notes.noteNumbers')"
      />
      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied'"
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
        :showNoteNumbers="areNoteNumbersShown"
        :sungMidi="sungMidi"
        :sungToneLabel="stableSungLabel"
        :sungToneCents="stableSungCents"
        :minCardWidth="sharedCardWidth"
        @naturalWidth="overviewNaturalWidth = $event"
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
        :showNoteNumbers="areNoteNumbersShown"
        :minCardWidth="sharedCardWidth"
        @naturalWidth="outlierNaturalWidth = $event"
      />
    </div>
  </div>
</template>

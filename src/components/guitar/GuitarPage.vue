<script setup lang="ts">
import {
  useDuetPitchDetection,
  type DuetLane,
} from '@/components/piano/useDuetPitchDetection'
import {
  DEFAULT_GUITAR_TUNING_ID,
  GUITAR_TUNINGS,
  isGuitarTuningId,
  type GuitarTuningId,
} from '@/utils/guitarTunings'
import {
  DEFAULT_SCALE_HIGHLIGHT_MODE,
  isScaleHighlightMode,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'
import { useLocalStorage } from '@vueuse/core'
import { guitarMidiMax, guitarMidiMin } from './guitarLayout'
import type { GuitarPreviewLaneId } from './guitarPreview'

/* Which tuning the board is strung to. Owned here rather than in the settings
 * row because the layout, the live-pitch preview and the duet band split all
 * derive from it. */
const tuningId = useLocalStorage<GuitarTuningId>(
  'syng.guitarTuning',
  DEFAULT_GUITAR_TUNING_ID,
)
/* A tuning id persisted from an older option list would leave the board with no
 * strings to draw. */
if (!isGuitarTuningId(tuningId.value)) {
  tuningId.value = DEFAULT_GUITAR_TUNING_ID
}

const tuningMidi = computed(() => GUITAR_TUNINGS[tuningId.value].midi)
const midiMin = computed(() => guitarMidiMin(tuningMidi.value))
const midiMax = computed(() => guitarMidiMax(tuningMidi.value))

/* Note-name labels on the fretboard: off, simple (C), or advanced (C4). */
const toneLabelMode = useToneLabelMode('syng.guitarToneLabelMode', 'off')

/* Which way the five accidentals are spelled — C♯ or D♭. A choice rather than
 * both spellings at once: the fret row is too short to stack them. Persisted
 * apart from the piano's own style, like every other per-page board setting. */
const accidentalStyle = useAccidentalStyle('syng.guitarAccidentals', 'sharp')

/* Scale highlight — tints the notes of one musical key/mode so the singer sees
 * the shape on the fretboard. Off by default: no root picked, nothing tinted.
 * PrimeSelect's clear button writes null, but -1 is what gets persisted so
 * useLocalStorage keeps a plain number serializer. */
const SCALE_ROOT_OFF = -1
const storedScaleRoot = useLocalStorage('syng.guitarScaleRoot', SCALE_ROOT_OFF)
const scaleRoot = computed<number | null>({
  get: () =>
    storedScaleRoot.value === SCALE_ROOT_OFF ? null : storedScaleRoot.value,
  set: (pitchClass) => {
    storedScaleRoot.value = pitchClass ?? SCALE_ROOT_OFF
  },
})

const scaleMode = useLocalStorage<ScaleHighlightMode>(
  'syng.guitarScaleMode',
  DEFAULT_SCALE_HIGHLIGHT_MODE,
)
/* A mode persisted from an older option list would highlight nothing. */
if (!isScaleHighlightMode(scaleMode.value)) {
  scaleMode.value = DEFAULT_SCALE_HIGHLIGHT_MODE
}

/* "See your voice" — drives the live mic preview. useIdlePreview requests mic
 * permission when the toggle flips on and resets it to false if denied, keeps
 * echo cancellation on (so played tones aren't mis-detected), and exposes a deaf
 * period we arm whenever a string sounds. */
const { isPreviewEnabled } = useSettings()

/* "Two singers" — splits the mic into a low and a high band so a man and a
 * woman singing together each get their own line. Persisted separately from the
 * piano's toggle so the two pages keep their own setting. */
const isDuetEnabled = useLocalStorage('syng.guitarDuetEnabled', false)

/* Exactly one detector ever opens the microphone: both composables watch their
 * own isEnabled, and these two are mutually exclusive. */
const isSinglePreviewEnabled = computed(
  () => isPreviewEnabled.value && !isDuetEnabled.value,
)
const isDuetPreviewEnabled = computed({
  get: () => isPreviewEnabled.value && isDuetEnabled.value,
  /* useDuetPitchDetection writes false back here when permission is denied. */
  set: (enabled) => {
    isDuetEnabled.value = enabled
  },
})

/* The guitar has no listening game, so it's always idle — the preview mic runs
 * whenever the toggle is on and permission is granted. */
const isGameActive = computed(() => false)
const {
  previewMidi,
  previewFrequency,
  previewNoteLabel,
  micPermission,
  triggerDeafPeriod,
} = useIdlePreview({ isGameActive, isEnabled: isSinglePreviewEnabled })

/* The board's span stands in for the piano's selected voice range as the duet
 * split input, so the split follows a tuning change. */
const {
  lowLane,
  highLane,
  triggerDeafPeriod: triggerDuetDeafPeriod,
} = useDuetPitchDetection({
  isEnabled: isDuetPreviewEnabled,
  midiMin: () => midiMin.value,
  midiMax: () => midiMax.value,
})

/* Single-voice mode renders through the same lane pipeline as duet mode, just
 * with one entry — no second code path in GuitarDisplay. */
const previewLanes = computed<
  Array<DuetLane & { laneId: GuitarPreviewLaneId }>
>(() =>
  isDuetEnabled.value
    ? [
        { ...lowLane.value, laneId: 'low' },
        { ...highLane.value, laneId: 'high' },
      ]
    : [
        {
          previewMidi: previewMidi.value,
          previewFrequency: previewFrequency.value,
          previewNoteLabel: previewNoteLabel.value,
          laneId: 'low',
        },
      ],
)

/* Fired whenever a string sounds. The inactive detector's deaf timer is
 * harmless. */
function handleTonePlayed() {
  triggerDeafPeriod()
  triggerDuetDeafPeriod()
}
</script>

<template>
  <!-- pb-6: the fretboard is the last thing on the page and is tall enough to
       run past the fold, so without it the board's bottom edge ends flush
       against the viewport with nothing to scroll into. [data-page] only sets
       horizontal padding. -->
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="guitar-page"
  >
    <GuitarSettingsRow
      v-model:tuningId="tuningId"
      v-model:toneLabelMode="toneLabelMode"
      v-model:accidentalStyle="accidentalStyle"
      v-model:isPreviewEnabled="isPreviewEnabled"
      v-model:isDuetEnabled="isDuetEnabled"
      :micPermission="micPermission"
    />

    <!-- Deliberately outside the settings row: that row is a scroller on mobile,
         and the scale pair is the one control reached for mid-practice, so it
         must never scroll out of sight. Two selects fit a phone unaided. -->
    <GuitarScaleSelect
      v-model:scaleRoot="scaleRoot"
      v-model:scaleMode="scaleMode"
    />

    <!-- Only the fretboard widens; the controls above size themselves. -->
    <div class="mx-auto w-full max-w-400">
      <GuitarDisplay
        :midiMin="midiMin"
        :midiMax="midiMax"
        :tuningMidi="tuningMidi"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :toneLabelMode="toneLabelMode"
        :accidentalStyle="accidentalStyle"
        :scaleRoot="scaleRoot"
        :scaleMode="scaleMode"
        @tonePlayed="handleTonePlayed"
      />
    </div>
  </div>
</template>

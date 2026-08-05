<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import type { PianoPreviewLaneId } from './pianoPreview'
import {
  DEFAULT_PIANO_SCALE_MODE,
  isPianoScaleMode,
  type PianoScaleMode,
} from './pianoScale'
import { useDuetPitchDetection, type DuetLane } from './useDuetPitchDetection'

/* Voice-range selector. The index lives here, not in the settings row, because
 * selectedRange also feeds the keyboard span and the duet band split. */
const rangeIndex = useVoiceRangeIndex('syng.rangeIndex')

/* Note-name labels on the keyboard: off, simple (C), or advanced (C4). */
const toneLabelMode = useToneLabelMode('syng.pianoToneLabelMode', 'off')
/* Scale highlight — tints the keys of one musical key/mode so the singer sees
 * the shape on the board. Off by default: no root picked, nothing tinted.
 * PrimeSelect's clear button writes null, but -1 is what gets persisted so
 * useLocalStorage keeps a plain number serializer. */
const SCALE_ROOT_OFF = -1
const storedScaleRoot = useLocalStorage('syng.pianoScaleRoot', SCALE_ROOT_OFF)
const scaleRoot = computed<number | null>({
  get: () =>
    storedScaleRoot.value === SCALE_ROOT_OFF ? null : storedScaleRoot.value,
  set: (pitchClass) => {
    storedScaleRoot.value = pitchClass ?? SCALE_ROOT_OFF
  },
})

const scaleMode = useLocalStorage<PianoScaleMode>(
  'syng.pianoScaleMode',
  DEFAULT_PIANO_SCALE_MODE,
)
/* A mode persisted from an older option list would highlight nothing. */
if (!isPianoScaleMode(scaleMode.value)) {
  scaleMode.value = DEFAULT_PIANO_SCALE_MODE
}

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

/* "See your voice" — drives the live mic preview. useIdlePreview requests mic
 * permission when the toggle flips on and resets it to false if denied, keeps
 * echo cancellation on (so played tones aren't mis-detected), and exposes a deaf
 * period we arm whenever a key plays. */
const { isPreviewEnabled } = useSettings()

/* "Two singers" — splits the mic into a low and a high band so a man and a
 * woman singing together each get their own line. Piano-only, so it persists
 * here rather than in the shared settings. */
const isDuetEnabled = useLocalStorage('syng.pianoDuetEnabled', false)

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

/* The piano has no listening game, so it's always idle — the preview mic runs
 * whenever the toggle is on and permission is granted. */
const isGameActive = computed(() => false)
const {
  previewMidi,
  previewFrequency,
  previewNoteLabel,
  micPermission,
  triggerDeafPeriod,
} = useIdlePreview({ isGameActive, isEnabled: isSinglePreviewEnabled })

const {
  lowLane,
  highLane,
  triggerDeafPeriod: triggerDuetDeafPeriod,
} = useDuetPitchDetection({
  isEnabled: isDuetPreviewEnabled,
  midiMin: () => selectedRange.value.midiMin,
  midiMax: () => selectedRange.value.midiMax,
})

/* Single-voice mode renders through the same lane pipeline as duet mode, just
 * with one entry — no second code path in PianoDisplay. */
const previewLanes = computed<Array<DuetLane & { laneId: PianoPreviewLaneId }>>(
  () =>
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

/* Fired on every key press. The inactive detector's deaf timer is harmless. */
function handleTonePlayed() {
  triggerDeafPeriod()
  triggerDuetDeafPeriod()
}
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4" data-testid="piano-page">
    <PianoSettingsRow
      v-model:rangeIndex="rangeIndex"
      v-model:toneLabelMode="toneLabelMode"
      v-model:isPreviewEnabled="isPreviewEnabled"
      v-model:isDuetEnabled="isDuetEnabled"
      :micPermission="micPermission"
    />

    <!-- Deliberately outside the settings row: that row is a scroller on mobile,
         and the scale pair is the one control reached for mid-practice, so it
         must never scroll out of sight. Two selects fit a phone unaided. -->
    <PianoScaleSelect
      v-model:scaleRoot="scaleRoot"
      v-model:scaleMode="scaleMode"
    />

    <!-- Only the keyboard widens (up to 1600px, matching the grace-kelly sheet);
         the controls above size themselves. -->
    <div class="mx-auto w-full max-w-400">
      <PianoDisplay
        :midiMin="selectedRange.midiMin"
        :midiMax="selectedRange.midiMax"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :toneLabelMode="toneLabelMode"
        :scaleRoot="scaleRoot"
        :scaleMode="scaleMode"
        @tonePlayed="handleTonePlayed"
      />
    </div>
  </div>
</template>

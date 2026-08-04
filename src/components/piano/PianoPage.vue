<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import type { ToneMode } from '@/composables/toneEngine'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import type { PianoPreviewLaneId } from './pianoPreview'
import { useDuetPitchDetection, type DuetLane } from './useDuetPitchDetection'

const { t } = useI18n()

const toneLabelModeOptions = useToneLabelModeOptions()

/* Tone-mode selector — mirrors PitchDetectorDisplay. Re-warm the AudioContext
 * inside the user-gesture frame so iOS Safari doesn't silently refuse a later
 * resume. */
const { setToneMode, warmUp } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed<ToneMode>({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    void warmUp().catch((error) =>
      debugLog('[TonePlayer] warmUp on tone-mode change failed', error),
    )
  },
})
setToneMode(storedToneMode.value)

/* Voice-range selector */
const rangeIndex = useVoiceRangeIndex('syng.rangeIndex')

/* Note-name labels on the keyboard: off, simple (C), or advanced (C4). */
const toneLabelMode = useLocalStorage<ToneLabelMode>(
  'syng.pianoToneLabelMode',
  'off',
)
const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)
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
    <div class="flex w-full max-w-3xl flex-wrap items-center gap-2 sm:gap-4">
      <PrimeSelect
        v-model="rangeIndex"
        :options="rangeOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.voiceRange') }}
          </div>
        </template>
      </PrimeSelect>

      <ToneModeSelect v-model="toneMode" class="min-w-30 flex-1" />

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied'"
      />

      <DuetToggle
        v-model="isDuetEnabled"
        :disabled="!isPreviewEnabled || micPermission === 'denied'"
      />

      <div class="flex items-center gap-2">
        <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
          t('notes.toneLabels')
        }}</label>
        <PrimeSelectButton
          v-model="toneLabelMode"
          :options="toneLabelModeOptions"
          optionLabel="label"
          optionValue="value"
          :allowEmpty="false"
          size="small"
          :aria-label="t('notes.toneLabels')"
        />
      </div>
    </div>

    <!-- Only the keyboard widens (up to 1600px, matching the grace-kelly sheet);
         the controls row above stays clamped to max-w-3xl. -->
    <div class="mx-auto w-full max-w-400">
      <PianoDisplay
        :midiMin="selectedRange.midiMin"
        :midiMax="selectedRange.midiMax"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :toneLabelMode="toneLabelMode"
        @tonePlayed="handleTonePlayed"
      />
    </div>
  </div>
</template>

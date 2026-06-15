<script setup lang="ts">
import {
  frequencyToMidi,
  midiToFrequency,
  midiToNoteLabel,
} from '@/utils/noteUtils'
import BarHighlightToggle from '@/components/grace-kelly/BarHighlightToggle.vue'
import { isOnPitch as isWithinTolerance } from '@/components/grace-kelly/graceKellySingPitch'
import { useStableSungLabel } from '@/components/grace-kelly/useStableSungLabel'
import NotesSettingsRow from './NotesSettingsRow.vue'
import NotesSheet from './NotesSheet.vue'
import { NOTE_SCALES } from './notesScales'
import type { NotesPlaybackResult } from './useNotesPlayback'

type Props = {
  /* A silent instance (useNotesPlayback({ silent: true })) — drives the sheet
   * timeline with no playback so the singer supplies the sound. */
  game: NotesPlaybackResult
  /* An audible instance — the ♪/Mute toggle plays the scale out loud so the
   * singer can hear it first. Never active at the same time as `game`. */
  previewGame: NotesPlaybackResult
}

const props = defineProps<Props>()

const clefIndex = defineModel<number>('clefIndex', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const isBarHighlightEnabled = defineModel<boolean>('isBarHighlightEnabled', {
  required: true,
})
const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  required: true,
})

const { t } = useI18n()

const scale = computed(() => NOTE_SCALES[clefIndex.value])

const {
  isPlaying,
  isPaused,
  isDone: singIsDone,
  activeNoteIndex: singActiveNoteIndex,
  start,
  stop,
} = props.game

/* Audible ♪/Mute preview — its own non-silent timeline, never running at the
 * same time as the silent sing timeline above. */
const {
  isPlaying: isPreviewPlaying,
  isDone: isPreviewDone,
  activeNoteIndex: previewActiveNoteIndex,
  start: startPreview,
  stop: stopPreview,
} = props.previewGame

/* The sheet reads one timeline at a time; surface whichever is active. The two
 * are mutually exclusive, so a simple coalesce is unambiguous. */
const activeNoteIndex = computed(
  () => previewActiveNoteIndex.value ?? singActiveNoteIndex.value,
)
const isDone = computed(() => singIsDone.value || isPreviewDone.value)

function togglePreview() {
  if (isPreviewPlaying.value) {
    stopPreview()

    return
  }

  void startPreview(scale.value.midis, bpm.value)
}

/* Expected sung range in Hz — the scale span ±1 semitone, so a stray
 * octave/harmonic misdetection bypasses the detector's smoothing. */
const bandFrequencies = computed(() => ({
  min: midiToFrequency(Math.min(...scale.value.midis) - 1),
  max: midiToFrequency(Math.max(...scale.value.midis) + 1),
}))

/* Live microphone pitch — its own AudioContext, independent of the Tone engine. */
const {
  frequency,
  isClean,
  isListening,
  error,
  start: startMic,
  stop: stopMic,
} = usePitchDetection({
  onsetDebounceMs: 0,
  clarityThreshold: 0.6,
  rawAudio: true,
  bandMinFrequency: () => bandFrequencies.value.min,
  bandMaxFrequency: () => bandFrequencies.value.max,
})

const isRunning = computed(() => isPlaying.value || isPaused.value)

/* Either timeline busy — locks the selects so clef/tempo can't change underneath
 * a running sing OR an audible preview. */
const isBusy = computed(() => isRunning.value || isPreviewPlaying.value)

const { isPreviewEnabled } = useSettings()

/* "See your voice" idle preview — listens only while NOT running, so it never
 * competes with the sing-flow mic above for the stream. */
const {
  previewMidi,
  rawFrequency: previewFrequency,
  micPermission,
} = useIdlePreview({
  isGameActive: isRunning,
  isEnabled: isPreviewEnabled,
})

/* Begin the silent timeline and open the mic together. */
function startSinging() {
  start(scale.value.midis, bpm.value)
  void startMic()
}

function stopSinging() {
  stop()
  stopMic()
}

/* Stop listening whenever the timeline leaves the running state. */
watch(isRunning, (running) => {
  if (!running) stopMic()
})

onUnmounted(() => {
  stopMic()
})

/* Sounding pitch of the active note. */
const currentToneLabel = computed(() => {
  if (activeNoteIndex.value === null) return null

  const midi = scale.value.midis[activeNoteIndex.value]
  if (midi === undefined) return null

  return midiToNoteLabel(midi).label
})

/* Target frequency of the active note, against which the sung pitch is judged. */
const targetFrequency = computed(() => {
  if (activeNoteIndex.value === null) return null

  const midi = scale.value.midis[activeNoteIndex.value]
  if (midi === undefined) return null

  return midiToFrequency(midi)
})

/* Continuous MIDI of the singer's live pitch (raw, not rounded). */
const sungMidi = computed(() => {
  if (isRunning.value) {
    if (!isListening.value || !isClean.value || frequency.value === null)
      return null

    return frequencyToMidi(frequency.value)
  }

  /* "See your voice" — idle / audible preview (hum along while the scale plays). */
  if (previewMidi.value === null || previewFrequency.value === null) return null

  return frequencyToMidi(previewFrequency.value)
})

/* True when the sung pitch is within tolerance of the active note. */
const isOnPitch = computed(() => {
  if (frequency.value === null || targetFrequency.value === null) return false

  return isWithinTolerance(frequency.value, targetFrequency.value)
})

const { stableSungLabel, stableSungCents } = useStableSungLabel({ sungMidi })
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="notes-sing-display"
  >
    <NotesSettingsRow
      v-model:clefIndex="clefIndex"
      v-model:bpm="bpm"
      v-model:areToneLabelsShown="areToneLabelsShown"
      :isRunning="isBusy"
      :showToneMode="false"
    />

    <div class="flex min-w-50 items-baseline gap-2">
      <PrimeButton
        v-if="isRunning"
        severity="danger"
        size="small"
        rounded
        class="min-w-20"
        @click="stopSinging"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <PrimeButton
        v-if="!isRunning"
        class="min-w-20"
        severity="success"
        size="small"
        rounded
        :disabled="isPreviewPlaying"
        @click="startSinging"
      >
        {{ t('notes.sing') }}
      </PrimeButton>

      <PrimeButton
        v-if="!isRunning"
        class="min-w-20"
        :class="{ 'toggle-sequence-idle': !isPreviewPlaying }"
        :severity="isPreviewPlaying ? 'warn' : 'secondary'"
        size="small"
        rounded
        @click="togglePreview"
      >
        {{
          isPreviewPlaying
            ? t('generic.muteButton')
            : t('generic.previewButton')
        }}
      </PrimeButton>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied' || isBusy"
      />

      <BarHighlightToggle v-model="isBarHighlightEnabled" />
    </div>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>

    <div class="w-full max-w-full">
      <NotesSheet
        :midis="scale.midis"
        :clef="scale.clef"
        :bpm="bpm"
        :activeNoteIndex="activeNoteIndex"
        :isDone="isDone"
        :currentToneLabel="currentToneLabel"
        :sungToneLabel="stableSungLabel"
        :sungToneCents="stableSungCents"
        :sungMidi="sungMidi"
        :isOnPitch="isOnPitch"
        :showToneLabels="areToneLabelsShown"
        :showBarHighlight="isBarHighlightEnabled"
      />
    </div>
  </div>
</template>

<style scoped lang="css">
.toggle-sequence-idle {
  padding-block: 0;
  font-size: 1.2rem;
}
</style>

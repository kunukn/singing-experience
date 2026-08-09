<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { midiToNoteLabel, type NoteInfo } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import PitchDisplay from './PitchDisplay.vue'
import type { PitchLaneDetection, PitchPreviewLane } from './pitchLanes'

type PitchDetectionInput = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  clarity: Readonly<Ref<number>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

type Props = {
  detection: PitchDetectionInput
  overridePreviewMidi?: number | null
  overridePreviewNoteLabel?: string | null
  overridePreviewFrequency?: number | null
  /* Simulated test pages set this to keep every real-mic path shut — the idle
   * preview and, with it, the duet detector, which has no simulated source. */
  disableIdlePreview?: boolean
}

const props = defineProps<Props>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })

const { t } = useI18n()

const { setToneMode, warmUp } = useTonePlayer()

const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed<ToneMode>({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    /* Re-resume the AudioContext while we're still inside the user-gesture
     * frame from selecting a tone — iOS Safari can suspend the context when
     * an overlay opens, and a later setTimeout-driven resume is silently
     * refused. */
    void warmUp().catch((error) =>
      debugLog('[TonePlayer] warmUp on tone-mode change failed', error),
    )
  },
})
setToneMode(storedToneMode.value)

const { frequency, noteInfo, clarity, isClean, error, start, stop } =
  props.detection

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

const { isPreviewEnabled } = useSettings()

/* Force-disable idle preview (and the mic it would open) in simulated test pages */
const effectivePreviewEnabled = computed(
  () => !props.disableIdlePreview && isPreviewEnabled.value,
)

/*
 * "Two singers" — splits the mic into a low and a high band so a man and a
 * woman singing together each get their own line, readout and recorded trail.
 * Persisted per page, like the piano's and guitar's own duet flags.
 */
const isDuetEnabled = useLocalStorage('syng.pitchDetectorDuetEnabled', false)
const isDuetAvailable = computed(() => !props.disableIdlePreview)
const effectiveDuetEnabled = computed(
  () => isDuetAvailable.value && isDuetEnabled.value,
)

/* Duet's own recording state. While duet is on, props.detection is never
 * started, so its isListening stays false and its microphone never opens. */
const isDuetRecording = ref(false)

/* The one flag the rest of the component reads: whichever detector is in
 * charge, this is whether a recording is running. */
const isListening = computed(() =>
  effectiveDuetEnabled.value
    ? isDuetRecording.value
    : props.detection.isListening.value,
)

/*
 * Exactly one detector ever holds the microphone. The duet one takes it
 * whenever duet is on and there is something to listen for — the live preview
 * or a running recording — and the single-voice pair stands down completely.
 */
const isDuetMicEnabled = computed({
  get: () =>
    effectiveDuetEnabled.value &&
    (isPreviewEnabled.value || isDuetRecording.value),
  /* useDuetPitchDetection writes false back here when permission is denied. */
  set: (enabled) => {
    if (enabled) return

    isDuetEnabled.value = false
    isDuetRecording.value = false
  },
})

const isSinglePreviewEnabled = computed(
  () => effectivePreviewEnabled.value && !effectiveDuetEnabled.value,
)

const isGameActive = computed(() => isListening.value)

const pitchDisplayRef = ref<InstanceType<typeof PitchDisplay> | null>(null)

const isPlayingSequence = computed(
  () => pitchDisplayRef.value?.isPlayingSequence ?? false,
)

const {
  previewMidi: rawPreviewMidi,
  previewNoteLabel,
  previewFrequency: rawPreviewFrequency,
  micPermission: idleMicPermission,
  triggerDeafPeriod: triggerIdleDeafPeriod,
  rawNoteInfo: previewRawNoteInfo,
  rawIsClean: previewRawIsClean,
  rawFrequency: previewRawFrequency,
  rawClarity: previewRawClarity,
} = useIdlePreview({
  isGameActive,
  isPlayingSequence,
  isEnabled: isSinglePreviewEnabled,
})

const {
  lowLane,
  highLane,
  lowDetection,
  highDetection,
  micPermission: duetMicPermission,
  triggerDeafPeriod: triggerDuetDeafPeriod,
} = useDuetPitchDetection({
  isEnabled: isDuetMicEnabled,
  midiMin: () => selectedRange.value.midiMin,
  midiMax: () => selectedRange.value.midiMax,
})

const micPermission = computed(() =>
  effectiveDuetEnabled.value
    ? duetMicPermission.value
    : idleMicPermission.value,
)

/*
 * Pass through the midi value so out-of-range notes render as a clamped line
 * at the chart boundary. Hide only when more than 12 semitones (1 octave)
 * outside the range — matching the DoReMi tolerance.
 */
function cullOutOfRange(midi: number | null): number | null {
  if (midi === null) return null
  if (
    midi < selectedRange.value.midiMin - 12 ||
    midi > selectedRange.value.midiMax + 12
  )
    return null

  return midi
}

/*
 * The single-voice preview line. While listening with preview enabled it is
 * sourced from the live mic detection so the dashed line keeps tracking the
 * sung pitch; in idle mode it falls back to useIdlePreview.
 */
const singlePreviewLane = computed<PitchPreviewLane>(() => {
  const isLive = isListening.value && isPreviewEnabled.value

  const midi = cullOutOfRange(
    props.overridePreviewMidi ??
      (isLive ? (noteInfo.value?.midiNote ?? null) : rawPreviewMidi.value),
  )

  if (midi === null) {
    return {
      laneId: 'low',
      previewMidi: null,
      previewFrequency: null,
      previewNoteLabel: null,
    }
  }

  let label: string | null
  if (isLive) {
    /* The canonical label path, so this matches the sustained-note badges the
     * chart draws from midiToNoteLabel — building the string by hand here left
     * the live badge spelling it "C#4" while the badge beside it read "C♯4". */
    label =
      props.overridePreviewNoteLabel ??
      (isClean.value && noteInfo.value
        ? midiToNoteLabel(noteInfo.value.midiNote).label
        : null)
  } else {
    label = props.overridePreviewNoteLabel ?? previewNoteLabel.value
  }

  return {
    laneId: 'low',
    previewMidi: midi,
    previewFrequency:
      props.overridePreviewFrequency ??
      (isLive ? frequency.value : rawPreviewFrequency.value),
    previewNoteLabel: label,
  }
})

/* Single-voice mode renders through the same lane pipeline as duet mode, just
 * with one entry — no second code path below here. */
const previewLanes = computed<PitchPreviewLane[]>(() => {
  if (!effectiveDuetEnabled.value) return [singlePreviewLane.value]

  /* "See your voice" governs the dashed lines in both modes: with it off, a
   * duet recording draws its trails but no live lines, exactly as a
   * single-voice one does. */
  if (!isPreviewEnabled.value) return []

  return [
    { ...lowLane.value, laneId: 'low' },
    { ...highLane.value, laneId: 'high' },
  ]
})

/*
 * What the readouts show and the chart records. While listening that is the
 * live recorder; when idle it is the preview detector, which is what put a
 * note on screen before you ever pressed Start.
 */
const laneDetections = computed<PitchLaneDetection[]>(() => {
  if (effectiveDuetEnabled.value) {
    return [
      { ...lowDetection.value, laneId: 'low' },
      { ...highDetection.value, laneId: 'high' },
    ]
  }

  if (isListening.value) {
    return [
      {
        laneId: 'low',
        noteInfo: noteInfo.value,
        frequency: frequency.value,
        clarity: clarity.value,
        isClean: isClean.value,
      },
    ]
  }

  return [
    {
      laneId: 'low',
      noteInfo: previewRawNoteInfo.value,
      frequency: previewRawFrequency.value,
      clarity: previewRawClarity.value,
      isClean: previewRawIsClean.value,
    },
  ]
})

function toggle() {
  pitchDisplayRef.value?.stopSequence()
  pitchDisplayRef.value?.stopReplay()

  if (effectiveDuetEnabled.value) {
    isDuetRecording.value = !isDuetRecording.value

    return
  }

  if (props.detection.isListening.value) stop()
  else start()
}

function handleTonePlayed() {
  /* The inactive detector's deaf timer is harmless. */
  triggerIdleDeafPeriod()
  triggerDuetDeafPeriod()
}

/* Re-arm the deaf window when the sequence finishes so the preview doesn't
 * flash immediately after the last note — the initial deaf period has
 * already expired by the time long sequences end. */
watch(isPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    handleTonePlayed()
  }
})

/* Switching voices mid-take would swap the microphone under a running
 * recording and leave the two sample buffers describing different things, so
 * the recording ends first. */
watch(effectiveDuetEnabled, () => {
  isDuetRecording.value = false
  if (props.detection.isListening.value) stop()
})

onUnmounted(() => {
  pitchDisplayRef.value?.stopSequence()
  pitchDisplayRef.value?.stopReplay()
  stop()
})
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4"
    data-testid="pitch-detector-display"
  >
    <div class="flex w-full flex-wrap items-center gap-2 sm:gap-4">
      <VoiceRangeSelect v-model:rangeIndex="rangeIndex" class="flex-1" />

      <div class="flex items-center gap-2">
        <label
          v-if="false"
          class="hidden text-sm text-(--p-text-muted-color) lg:block"
        >
          {{ t('sounds.toneSound') }}
        </label>
        <ToneModeSelect v-model="toneMode" class="min-w-30 flex-1" />
      </div>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied'"
      />

      <DuetToggle
        v-if="isDuetAvailable"
        v-model="isDuetEnabled"
        :disabled="!isPreviewEnabled || micPermission === 'denied'"
      />

      <PrimeButton
        class="ms-auto min-w-20"
        :severity="isListening ? 'danger' : 'success'"
        size="small"
        rounded
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </PrimeButton>
    </div>

    <p v-if="error" class="mb-4 text-sm text-(--p-red-400)">{{ error }}</p>

    <slot />

    <PitchDisplay
      ref="pitchDisplayRef"
      :laneDetections="laneDetections"
      :previewLanes="previewLanes"
      :isListening="isListening"
      :midiMin="selectedRange.midiMin"
      :midiMax="selectedRange.midiMax"
      :isPreviewEnabled="effectivePreviewEnabled"
      :isMicPermissionGranted="micPermission === 'granted'"
      @tonePlayed="handleTonePlayed"
    />
  </div>
</template>

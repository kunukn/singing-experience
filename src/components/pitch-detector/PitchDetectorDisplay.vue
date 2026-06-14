<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import PitchDisplay from './PitchDisplay.vue'

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
    void warmUp().catch((err) =>
      debugLog('[TonePlayer] warmUp on tone-mode change failed', err),
    )
  },
})
setToneMode(storedToneMode.value)

const {
  frequency,
  noteInfo,
  clarity,
  isListening,
  isClean,
  error,
  start,
  stop,
} = props.detection

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)

const { isPreviewEnabled } = useSettings()

/* Force-disable idle preview (and the mic it would open) in simulated test pages */
const effectivePreviewEnabled = computed(
  () => !props.disableIdlePreview && isPreviewEnabled.value,
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
  micPermission,
  triggerDeafPeriod: triggerIdleDeafPeriod,
  rawNoteInfo: previewRawNoteInfo,
  rawIsClean: previewRawIsClean,
  rawFrequency: previewRawFrequency,
  rawClarity: previewRawClarity,
} = useIdlePreview({
  isGameActive,
  isPlayingSequence,
  isEnabled: effectivePreviewEnabled,
})

/*
 * Pass through the midi value so out-of-range notes render as a clamped line
 * at the chart boundary. Hide only when more than 12 semitones (1 octave)
 * outside the range — matching the DoReMi tolerance.
 *
 * While listening with preview enabled, source the indicator from the live
 * mic detection so the orange dashed line keeps tracking the sung pitch.
 * In idle mode, fall back to useIdlePreview.
 */
const previewMidi = computed(() => {
  let midi: number | null

  if (isListening.value && isPreviewEnabled.value) {
    midi = props.overridePreviewMidi ?? noteInfo.value?.midiNote ?? null
  } else {
    midi = props.overridePreviewMidi ?? rawPreviewMidi.value
  }

  if (midi === null) return null
  if (
    midi < selectedRange.value.midiMin - 12 ||
    midi > selectedRange.value.midiMax + 12
  )
    return null

  return midi
})

const effectivePreviewNoteLabel = computed(() => {
  if (previewMidi.value === null) return null

  if (isListening.value && isPreviewEnabled.value) {
    if (props.overridePreviewNoteLabel) return props.overridePreviewNoteLabel
    if (!isClean.value) return null

    const info = noteInfo.value
    if (!info) return null

    return `${info.note}${info.octave}`
  }

  return props.overridePreviewNoteLabel ?? previewNoteLabel.value
})

const previewFrequency = computed(() => {
  if (previewMidi.value === null) return null

  if (isListening.value && isPreviewEnabled.value) {
    return props.overridePreviewFrequency ?? frequency.value
  }

  return props.overridePreviewFrequency ?? rawPreviewFrequency.value
})

function toggle() {
  pitchDisplayRef.value?.stopSequence()
  pitchDisplayRef.value?.stopReplay()
  if (isListening.value) stop()
  else start()
}

function handleTonePlayed() {
  triggerIdleDeafPeriod()
}

/* Re-arm the deaf window when the sequence finishes so the preview doesn't
 * flash immediately after the last note — the initial deaf period has
 * already expired by the time long sequences end. */
watch(isPlayingSequence, (playing, wasPlaying) => {
  if (wasPlaying && !playing) {
    triggerIdleDeafPeriod()
  }
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
      :noteInfo="noteInfo"
      :frequency="frequency"
      :clarity="clarity"
      :isClean="isClean"
      :isListening="isListening"
      :midiMin="selectedRange.midiMin"
      :midiMax="selectedRange.midiMax"
      :previewMidi="previewMidi"
      :previewNoteLabel="effectivePreviewNoteLabel"
      :previewFrequency="previewFrequency"
      :isPreviewEnabled="effectivePreviewEnabled"
      :isMicPermissionGranted="micPermission === 'granted'"
      :previewNoteInfoFull="previewRawNoteInfo"
      :previewIsClean="previewRawIsClean"
      :previewRawFrequency="previewRawFrequency"
      :previewClarity="previewRawClarity"
      @tonePlayed="handleTonePlayed"
    />
  </div>
</template>

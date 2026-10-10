<script setup lang="ts">
import type { PianoPreviewLaneId } from '@/components/piano/pianoPreview'
import type { PitchDetectionInput } from '@/components/song-recorder/useSongRecorder'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { midiToNoteLabel, type NoteInfo } from '@/utils/noteUtils'
import { keyAccidentalStyle, pitchClassLabel } from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'
import { useMediaQuery } from '@vueuse/core'
import ScaleDetectorResults from './ScaleDetectorResults.vue'
import { useScaleDetector } from './useScaleDetector'

type Props = {
  detection: PitchDetectionInput & {
    noteInfo: Readonly<Ref<NoteInfo | null>>
  }
  /* Test pages: draw "See your voice" from the simulated `detection` instead
   * of opening the real mic via useIdlePreview. */
  simulateIdlePreview?: boolean
}

const props = defineProps<Props>()

const { t } = useI18n()

const detector = useScaleDetector({ detection: props.detection })
const {
  isListening,
  notes,
  result,
  selectedCandidate,
  select,
  toggleListening,
  pressPianoKey,
  releasePianoKey,
  reset,
} = detector

const accidentalStyle = computed(() => {
  const selected = selectedCandidate.value

  return selected ? keyAccidentalStyle(selected.root, selected.mode) : 'sharp'
})

/* Each pitch class once, in the order it was first sung. */
const sungLabels = computed(() =>
  [...new Set(notes.value.map((note) => pitchClassOf(note.midi)))].map(
    (pitchClass) => pitchClassLabel(pitchClass, accidentalStyle.value),
  ),
)

const tieBreakerText = computed(() => {
  const tieBreaker = result.value.tieBreaker
  const [first, second] = result.value.families
  if (!tieBreaker || !first || !second) return null

  const [firstPitchClass, secondPitchClass] = tieBreaker.pitchClasses
  const spell = (pitchClass: number, home: (typeof first.candidates)[number]) =>
    pitchClassLabel(pitchClass, keyAccidentalStyle(home.root, home.mode))

  return t('scaleDetector.tieBreaker', {
    first: spell(firstPitchClass, first.candidates[0]),
    second: spell(secondPitchClass, second.candidates[0]),
  })
})

/* The app-wide range, shared with every other page that picks one. */
const rangeIndex = useVoiceRangeIndex('syng.rangeIndex')
const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

const { areKeyboardHintsVisible } = useKeyboardHints()

/* PianoDisplay never draws the chips on touch, so the toggle would be a no-op. */
const isCoarsePointer = useMediaQuery('(pointer: coarse)')

const { isPreviewEnabled } = useSettings()

/* "See your voice" between listening sessions, as on /piano. While listening
 * the detector's own mic draws the line instead. The setter keeps the shared
 * setting writable so useIdlePreview can switch it off when permission is
 * denied; the getter is false on a simulated page, so the real mic never
 * opens there. */
const isRealIdlePreviewEnabled = computed({
  get: () => isPreviewEnabled.value && !props.simulateIdlePreview,
  set: (enabled: boolean) => {
    isPreviewEnabled.value = enabled
  },
})

const {
  previewMidi: idlePreviewMidi,
  previewFrequency: idlePreviewFrequency,
  previewNoteLabel: idlePreviewNoteLabel,
  micPermission,
  triggerDeafPeriod,
} = useIdlePreview({
  isGameActive: computed(() => isListening.value),
  isEnabled: isRealIdlePreviewEnabled,
})

/* Simulated page: the one detector doubles as the idle preview while the
 * toggle is on. Starting to listen hands it to the scale detector, so it is
 * only stopped here when nobody is listening. */
const isSimulatedIdlePreviewOn = computed(
  () =>
    !!props.simulateIdlePreview && isPreviewEnabled.value && !isListening.value,
)
watch(
  isSimulatedIdlePreviewOn,
  (isOn) => {
    if (isOn) void props.detection.start()
    else if (!isListening.value) props.detection.stop()
  },
  { immediate: true },
)

const EMPTY_PIANO_LANE: DuetLane & { laneId: PianoPreviewLaneId } = {
  previewMidi: null,
  previewFrequency: null,
  previewNoteLabel: null,
  laneId: 'low',
}

/* The live voice as a line on the keys: from the detector while listening
 * (or on a simulated page), from the idle preview mic otherwise. */
const previewLanes = computed<Array<DuetLane & { laneId: PianoPreviewLaneId }>>(
  () => {
    if (!isPreviewEnabled.value) return [EMPTY_PIANO_LANE]

    if (!isListening.value && !props.simulateIdlePreview) {
      return [
        {
          previewMidi: idlePreviewMidi.value,
          previewFrequency: idlePreviewFrequency.value,
          previewNoteLabel: idlePreviewNoteLabel.value,
          laneId: 'low',
        },
      ]
    }

    const noteInfo = props.detection.noteInfo.value
    if (!noteInfo || !props.detection.isClean.value) return [EMPTY_PIANO_LANE]

    return [
      {
        previewMidi: noteInfo.midiNote,
        previewFrequency: props.detection.frequency.value,
        previewNoteLabel: midiToNoteLabel(noteInfo.midiNote).label,
        laneId: 'low',
      },
    ]
  },
)

defineExpose({ detector })
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="scale-detector-display"
  >
    <div class="flex w-full max-w-180 flex-col items-center gap-4 px-4">
      <p class="text-center text-sm text-(--p-text-muted-color)">
        {{ t('scaleDetector.pageDescription') }}
      </p>

      <p v-if="detection.error.value" class="text-sm text-(--p-red-400)">
        {{ detection.error.value }}
      </p>

      <slot />

      <div class="flex items-center justify-center gap-2">
        <PrimeButton
          class="min-w-20"
          :severity="isListening ? 'danger' : 'success'"
          size="small"
          rounded
          data-testid="scale-detector-listen"
          @click="toggleListening"
        >
          {{ isListening ? t('generic.stop') : t('generic.start') }}
        </PrimeButton>
        <PrimeButton
          severity="secondary"
          size="small"
          rounded
          outlined
          icon="pi pi-refresh"
          :label="t('scaleDetector.startOver')"
          :disabled="notes.length === 0"
          data-testid="scale-detector-reset"
          @click="reset"
        />
        <PreviewToggle
          v-model="isPreviewEnabled"
          :disabled="!simulateIdlePreview && micPermission === 'denied'"
        />
      </div>

      <div
        class="flex min-h-8 flex-wrap items-center justify-center gap-2"
        data-testid="scale-detector-sung-notes"
      >
        <template v-if="sungLabels.length > 0">
          <span class="text-sm text-(--p-text-muted-color)">
            {{ t('scaleDetector.yourNotes') }}
          </span>
          <PrimeTag
            v-for="label in sungLabels"
            :key="label"
            :value="label"
            severity="success"
          />
        </template>
        <span v-else class="text-sm text-(--p-text-muted-color)">
          {{
            isListening ? t('generic.listening') : t('scaleDetector.noNotesYet')
          }}
        </span>
      </div>

      <ScaleDetectorResults
        :result="result"
        :selected="selectedCandidate"
        @select="select"
      />

      <p
        v-if="tieBreakerText"
        class="text-center text-sm text-(--p-blue-400)"
        data-testid="scale-detector-tie-breaker"
      >
        {{ tieBreakerText }}
      </p>

      <div class="flex items-center justify-center gap-2">
        <VoiceRangeSelect
          v-model:rangeIndex="rangeIndex"
          :headerLabel="t('scaleDetector.pianoRange')"
        />
        <KeyboardHintsToggle
          v-if="!isCoarsePointer"
          v-model="areKeyboardHintsVisible"
        />
      </div>
    </div>

    <div class="mx-auto w-full max-w-400">
      <PianoDisplay
        :midiMin="selectedRange.midiMin"
        :midiMax="selectedRange.midiMax"
        toneLabelMode="simple"
        :isOctaveShownOnC="true"
        :accidentalStyle="accidentalStyle"
        :areKeyboardHintsVisible="areKeyboardHintsVisible"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :scaleRoot="selectedCandidate?.root ?? null"
        :scaleMode="selectedCandidate?.mode"
        :markedPitchClasses="result.sungPitchClasses"
        shouldColorByCents
        @notePressed="(midi) => pressPianoKey(midi)"
        @noteReleased="(midi) => releasePianoKey(midi)"
        @tonePlayed="triggerDeafPeriod"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PianoPreviewLaneId } from '@/components/piano/pianoPreview'
import type { PitchDetectionInput } from '@/components/song-recorder/useSongRecorder'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { chordAccidentalStyle, chordPitchClasses } from '@/utils/chordDetection'
import { midiToNoteLabel, type NoteInfo } from '@/utils/noteUtils'
import { keyAccidentalStyle, pitchClassLabel } from '@/utils/scaleDetection'
import { pitchClassOf } from '@/utils/scaleHighlight'
import { useLocalStorage, useMediaQuery } from '@vueuse/core'
import ChordDetectorResults from './ChordDetectorResults.vue'
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

const route = useRoute()
const router = useRouter()

const TAB_VALUES = ['scales', 'chords'] as const
type DetectorTab = (typeof TAB_VALUES)[number]
const DEFAULT_TAB: DetectorTab = 'scales'

/* Active tab lives only in the URL (?tab=scales|chords), as on /notes.
 * replace() keeps tab switches out of the browser history. */
const activeTab = computed<DetectorTab>({
  get() {
    const tab = route.query.tab

    return TAB_VALUES.includes(tab as DetectorTab)
      ? (tab as DetectorTab)
      : DEFAULT_TAB
  },
  set(tab) {
    router.replace({ query: { ...route.query, tab } })
  },
})
const isChordTab = computed(() => activeTab.value === 'chords')

const INPUT_MODES = ['voiceAndPiano', 'pianoOnly'] as const
type InputMode = (typeof INPUT_MODES)[number]
const DEFAULT_INPUT_MODE: InputMode = 'voiceAndPiano'

/* Piano only keeps background noise out: the mic never opens, for the
 * detector or for "See your voice". */
const inputMode = useLocalStorage<InputMode>(
  'syng.scaleDetectorInputMode',
  DEFAULT_INPUT_MODE,
)
if (!INPUT_MODES.includes(inputMode.value)) {
  inputMode.value = DEFAULT_INPUT_MODE
}
const isVoiceEnabled = computed(() => inputMode.value === 'voiceAndPiano')
const inputModeOptions = computed(() =>
  INPUT_MODES.map((mode) => ({
    value: mode,
    label: t(`scaleDetector.inputMode.${mode}`),
  })),
)

const detector = useScaleDetector({
  detection: props.detection,
  isVoiceEnabled,
})
const {
  isListening,
  notes,
  result,
  selectedCandidate,
  select,
  chordResult,
  selectedChord,
  selectChord,
  toggleListening,
  pressPianoKey,
  releasePianoKey,
  reset,
} = detector

const accidentalStyle = computed(() => {
  if (isChordTab.value) {
    const chord = selectedChord.value

    return chord ? chordAccidentalStyle(chord.root, chord.type) : 'sharp'
  }

  const selected = selectedCandidate.value

  return selected ? keyAccidentalStyle(selected.root, selected.mode) : 'sharp'
})

/* The piano tints the picked scale on one tab and the picked chord's notes
 * on the other. */
const highlightRoot = computed(() =>
  isChordTab.value
    ? (selectedChord.value?.root ?? null)
    : (selectedCandidate.value?.root ?? null),
)
const chordHighlight = computed(() => {
  const chord = selectedChord.value
  if (!isChordTab.value || !chord) return undefined

  return chordPitchClasses(chord.root, chord.type)
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
  get: () =>
    isPreviewEnabled.value &&
    isVoiceEnabled.value &&
    !props.simulateIdlePreview,
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
    !!props.simulateIdlePreview &&
    isPreviewEnabled.value &&
    isVoiceEnabled.value &&
    !isListening.value,
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
    if (!isPreviewEnabled.value || !isVoiceEnabled.value) {
      return [EMPTY_PIANO_LANE]
    }

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
  <PrimeTabs
    v-model:value="activeTab"
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="scale-detector-display"
  >
    <PrimeTabList class="mx-auto w-full max-w-400">
      <PrimeTab value="scales" data-testid="scale-detector-tab-scales">
        {{ t('scaleDetector.tabs.scales') }}
      </PrimeTab>
      <PrimeTab value="chords" data-testid="scale-detector-tab-chords">
        {{ t('scaleDetector.tabs.chords') }}
      </PrimeTab>
    </PrimeTabList>

    <div class="flex w-full max-w-180 flex-col items-center gap-4 px-4">
      <p class="text-center text-sm text-(--p-text-muted-color)">
        {{
          isChordTab
            ? t('scaleDetector.chords.pageDescription')
            : t('scaleDetector.pageDescription')
        }}
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
          :disabled="
            !isVoiceEnabled ||
            (!simulateIdlePreview && micPermission === 'denied')
          "
        />
      </div>

      <PrimeSelectButton
        v-model="inputMode"
        :options="inputModeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        data-testid="scale-detector-input-mode"
      />

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
            isListening
              ? t('generic.listening')
              : isVoiceEnabled
                ? t('scaleDetector.noNotesYet')
                : t('scaleDetector.noNotesYetPianoOnly')
          }}
        </span>
      </div>

      <PrimeTabPanels class="w-full p-0">
        <PrimeTabPanel value="scales" class="flex flex-col gap-4">
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
        </PrimeTabPanel>
        <PrimeTabPanel value="chords">
          <ChordDetectorResults
            :result="chordResult"
            :selected="selectedChord"
            @select="selectChord"
          />
        </PrimeTabPanel>
      </PrimeTabPanels>

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
        :scaleRoot="highlightRoot"
        :scaleMode="selectedCandidate?.mode"
        :highlightPitchClasses="chordHighlight"
        :markedPitchClasses="result.sungPitchClasses"
        shouldColorByCents
        @notePressed="(midi) => pressPianoKey(midi)"
        @noteReleased="(midi) => releasePianoKey(midi)"
        @tonePlayed="triggerDeafPeriod"
      />
    </div>
  </PrimeTabs>
</template>

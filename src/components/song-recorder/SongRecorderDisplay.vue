<script setup lang="ts">
import { useStableSungLabel } from '@/components/grace-kelly/useStableSungLabel'
import type { ClefKey } from '@/components/notes/notesConstants'
import type { PianoPreviewLaneId } from '@/components/piano/pianoPreview'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import {
  frequencyToMidi,
  midiToNoteLabel,
  type NoteInfo,
} from '@/utils/noteUtils'
import SongRecorderAbcEditor, {
  type AbcEditorMessage,
} from './SongRecorderAbcEditor.vue'
import SongRecorderPianoPanel from './SongRecorderPianoPanel.vue'
import SongRecorderSettingsRow from './SongRecorderSettingsRow.vue'
import SongRecorderSheet from './SongRecorderSheet.vue'
import { parseAbcImport } from './songRecorderAbcImport'
import {
  BEATS_PER_BAR,
  type Grid,
  type SongRecorderInput,
} from './songRecorderConstants'
import { useSongRecorder, type PitchDetectionInput } from './useSongRecorder'

type Props = {
  detection: PitchDetectionInput & {
    noteInfo: Readonly<Ref<NoteInfo | null>>
    isListening: Readonly<Ref<boolean>>
  }
  /* Test pages: draw "See your voice" from the simulated `detection` instead
   * of opening the real mic via useIdlePreview. */
  simulateIdlePreview?: boolean
}

const props = defineProps<Props>()

const bpm = defineModel<number>('bpm', { required: true })
const grid = defineModel<Grid>('grid', { required: true })
const clef = defineModel<ClefKey>('clef', { required: true })
const isClickEnabled = defineModel<boolean>('isClickEnabled', {
  required: true,
})
const input = defineModel<SongRecorderInput>('input', { required: true })

const { t } = useI18n()

const recorder = useSongRecorder({
  detection: props.detection,
  bpm,
  grid,
  clef,
  isClickEnabled,
  input,
})
const {
  isIdle,
  isCountingIn,
  isRecording,
  isReview,
  isPlaying,
  isPaused,
  countInBeat,
  beatInBar,
  elapsedMs,
  limitMs,
  hasNotes,
  sheet,
  displaySheet,
  pieceKinds,
  nowPieceIndex,
  activePieceIndex,
  hasPlayedToEnd,
  record,
  stop,
  play,
  pause,
  resume,
  stopPlayback,
  reset,
  importEvents,
  pressPianoKey,
  releasePianoKey,
} = recorder

const isTaking = computed(() => isCountingIn.value || isRecording.value)
const isPlaybackRunning = computed(() => isPlaying.value || isPaused.value)
const isPianoInput = computed(() => input.value === 'piano')

const { isPreviewEnabled } = useSettings()

/* "See your voice" — the live pitch as a line on the staff and the piano.
 * Between takes the idle preview listens, whichever the input (silent during
 * playback, so the speaker isn't drawn); during a voice take the recording mic
 * draws it on the staff. The setter keeps the shared setting writable so
 * useIdlePreview can switch it off when permission is denied; the getter is
 * false on a simulated page, so the real mic never opens there. */
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
  rawFrequency: idleFrequency,
  rawIsClean: idleIsClean,
  isPreviewListening: isIdleListening,
  micPermission,
  triggerDeafPeriod,
} = useIdlePreview({
  isGameActive: computed(() => isTaking.value || isPlaybackRunning.value),
  isEnabled: isRealIdlePreviewEnabled,
})

const isIdleSource = computed(
  () => !isTaking.value && !props.simulateIdlePreview,
)

/* The piano key held right now. Piano input draws it on the staff the way
 * the voice preview draws the sung pitch. */
const heldPianoMidi = ref<number | null>(null)

function handlePianoPressed(midi: number, timeStamp: number) {
  heldPianoMidi.value = midi
  pressPianoKey(midi, timeStamp)
}

function handlePianoReleased(midi: number, timeStamp: number) {
  if (heldPianoMidi.value === midi) heldPianoMidi.value = null
  releasePianoKey(midi, timeStamp)
}

/* Keep the piano's own sound from being drawn as sung pitch — the idle mic
 * listens in both input modes. */
function handlePianoTonePlayed() {
  triggerDeafPeriod()
}

/* Continuous MIDI of the live pitch; null hides the line. */
const sungMidi = computed(() => {
  if (isPianoInput.value) {
    return isPlaybackRunning.value ? null : heldPianoMidi.value
  }

  if (!isPreviewEnabled.value || isPlaybackRunning.value) return null

  const frequency = isIdleSource.value
    ? idleFrequency.value
    : props.detection.frequency.value
  const isClean = isIdleSource.value
    ? idleIsClean.value
    : props.detection.isClean.value
  const isListening = isIdleSource.value
    ? isIdleListening.value
    : props.detection.isListening.value
  if (!isListening || !isClean || frequency === null) return null

  return frequencyToMidi(frequency)
})

const EMPTY_PIANO_LANE: DuetLane & { laneId: PianoPreviewLaneId } = {
  previewMidi: null,
  previewFrequency: null,
  previewNoteLabel: null,
  laneId: 'low',
}

/* The idle "See your voice" line on the piano, as on /piano. Idle only: a take
 * or playback empties it. A simulated page reads its one detector instead of
 * the real mic. */
const pianoPreviewLanes = computed<
  Array<DuetLane & { laneId: PianoPreviewLaneId }>
>(() => {
  if (!isPreviewEnabled.value || isTaking.value || isPlaybackRunning.value) {
    return [EMPTY_PIANO_LANE]
  }

  if (!props.simulateIdlePreview) {
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
})

const { stableSungLabel, stableSungCents } = useStableSungLabel({
  sungMidi,
  showOctave: ref(true),
})

/* Simulated page: the one detector doubles as the idle preview while the
 * toggle is on. A voice take keeps it running; a piano take never reads it,
 * so it stops. Leaving a take restarts it. */
const isSimulatedIdlePreviewOn = computed(
  () =>
    !!props.simulateIdlePreview &&
    isPreviewEnabled.value &&
    !isTaking.value &&
    !isPlaybackRunning.value,
)
watch(
  isSimulatedIdlePreviewOn,
  (isOn) => {
    if (isOn) void props.detection.start()
    else if (!isTaking.value || isPianoInput.value) props.detection.stop()
  },
  { immediate: true },
)

const liveNoteLabel = computed(() => {
  if (isPianoInput.value) {
    if (!isRecording.value || heldPianoMidi.value === null) return null

    return midiToNoteLabel(heldPianoMidi.value, { showOctave: true }).label
  }

  const noteInfo = props.detection.noteInfo.value
  if (!isRecording.value || !props.detection.isClean.value || !noteInfo) {
    return null
  }

  return midiToNoteLabel(noteInfo.midiNote, { showOctave: true }).label
})

function formatSeconds(ms: number) {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}

const beatDots = Array.from({ length: BEATS_PER_BAR }, (_, index) => index + 1)

/* The ABC box: shows the take's notation in review (refreshed when the grid or
 * clef redraws it), doubles as the paste box for an import, and empties on a
 * new recording. */
const abcText = ref('')
const abcMessage = ref<AbcEditorMessage | null>(null)

watch(
  () => (isReview.value ? sheet.value.abc : null),
  (abc) => {
    if (abc !== null) abcText.value = abc
  },
)

watch(isIdle, (idle) => {
  if (!idle) return

  abcText.value = ''
  abcMessage.value = null
})

function importAbc() {
  const result = parseAbcImport(abcText.value, {
    bpm: bpm.value,
    grid: grid.value,
  })
  if (!result.ok) {
    abcMessage.value = {
      severity: 'error',
      text: t(`songRecorder.importErrors.${result.error}`, {
        detail: result.detail ?? '',
      }),
    }

    return
  }

  bpm.value = result.bpm
  grid.value = result.grid
  clef.value = result.clef
  importEvents(result.events)
  /* Show the notation as the recorder understood it, even when it matches the
   * previous take's (the review watcher wouldn't fire then). */
  abcText.value = sheet.value.abc
  abcMessage.value =
    result.notices.length > 0
      ? {
          severity: 'warn',
          text: result.notices
            .map((notice) => t(`songRecorder.importNotices.${notice}`))
            .join(' '),
        }
      : null
}

/* Exposed for the test page's scripted demo melody. */
defineExpose({ recorder })
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-400 flex-1 flex-col items-center gap-4 px-2 pb-4"
    data-testid="song-recorder-display"
    :data-input="input"
    :data-phase="
      isIdle
        ? 'idle'
        : isCountingIn
          ? 'countIn'
          : isRecording
            ? 'recording'
            : 'review'
    "
  >
    <SongRecorderSettingsRow
      v-model:bpm="bpm"
      v-model:grid="grid"
      v-model:clef="clef"
      v-model:isClickEnabled="isClickEnabled"
      v-model:input="input"
      :isInputLocked="isTaking"
      :isTempoLocked="!isIdle"
      :isGridLocked="isTaking || isPlaybackRunning"
    />

    <div class="flex flex-wrap items-center justify-center gap-2">
      <PrimeButton
        v-if="isIdle"
        severity="danger"
        size="small"
        rounded
        icon="pi pi-circle-fill"
        :label="t('songRecorder.record')"
        class="min-h-8.75 min-w-24"
        data-testid="song-recorder-record"
        @click="record"
      />

      <PrimeButton
        v-if="isTaking"
        severity="danger"
        size="small"
        rounded
        :label="t('generic.stop')"
        class="min-h-8.75 min-w-24"
        data-testid="song-recorder-stop"
        @click="stop"
      />

      <template v-if="isReview">
        <PrimeButton
          v-if="!isPlaybackRunning"
          severity="success"
          size="small"
          rounded
          :label="t('generic.play')"
          :disabled="!hasNotes"
          class="min-h-8.75 min-w-20"
          data-testid="song-recorder-play"
          @click="play"
        />
        <PrimeButton
          v-if="isPlaying"
          severity="warn"
          size="small"
          rounded
          :label="t('generic.pause')"
          class="min-h-8.75 min-w-20"
          data-testid="song-recorder-pause"
          @click="pause"
        />
        <PrimeButton
          v-if="isPaused"
          severity="success"
          size="small"
          rounded
          :label="t('generic.resume')"
          class="min-h-8.75 min-w-20"
          data-testid="song-recorder-resume"
          @click="resume"
        />
        <PrimeButton
          v-if="isPlaybackRunning"
          severity="danger"
          size="small"
          rounded
          :label="t('generic.stop')"
          class="min-h-8.75 min-w-20"
          data-testid="song-recorder-stop-playback"
          @click="stopPlayback"
        />
        <PrimeButton
          severity="secondary"
          size="small"
          rounded
          icon="pi pi-refresh"
          class="min-h-8.75"
          :label="t('songRecorder.newRecording')"
          data-testid="song-recorder-reset"
          @click="reset"
        />
      </template>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="
          isPlaybackRunning ||
          (isTaking && isPianoInput) ||
          (!simulateIdlePreview && micPermission === 'denied')
        "
      />
    </div>

    <p
      v-if="isIdle"
      class="max-w-prose text-center text-sm text-(--p-text-muted-color)"
    >
      {{
        t(isPianoInput ? 'songRecorder.hintPiano' : 'songRecorder.hint', {
          seconds: Math.round(limitMs / 1000),
        })
      }}
    </p>

    <div
      v-if="isCountingIn"
      class="text-5xl font-bold text-(--p-primary-color) tabular-nums"
      data-testid="song-recorder-count-in"
    >
      {{ countInBeat ?? '' }}
    </div>

    <div
      v-if="isRecording"
      class="flex items-center gap-4"
      data-testid="song-recorder-status"
    >
      <div class="flex gap-1.5" aria-hidden="true">
        <span
          v-for="beat in beatDots"
          :key="beat"
          class="size-3 rounded-full transition-colors duration-75"
          :class="
            beat === beatInBar
              ? 'bg-(--p-primary-color)'
              : 'bg-(--p-content-border-color)'
          "
        />
      </div>
      <span class="text-sm text-(--p-text-muted-color) tabular-nums">
        {{ formatSeconds(elapsedMs) }} / {{ formatSeconds(limitMs) }}
      </span>
      <span
        class="min-w-10 text-center font-semibold text-(--p-primary-color) tabular-nums"
        data-testid="song-recorder-live-note"
      >
        {{ liveNoteLabel ?? '–' }}
      </span>
    </div>

    <p v-if="isReview && !hasNotes" class="text-sm text-(--p-text-muted-color)">
      {{
        t(isPianoInput ? 'songRecorder.noNotesPiano' : 'songRecorder.noNotes')
      }}
    </p>

    <div class="w-full max-w-full">
      <SongRecorderSheet
        :abc="displaySheet.abc"
        :activePieceIndex="activePieceIndex"
        :pieceKinds="pieceKinds"
        :nowPieceIndex="nowPieceIndex"
        :isDone="hasPlayedToEnd"
        :isLive="isCountingIn || isRecording"
        :clef="clef"
        :sungMidi="sungMidi"
        :sungToneLabel="stableSungLabel"
        :sungToneCents="stableSungCents"
      />
    </div>

    <SongRecorderPianoPanel
      :isPianoInput="isPianoInput"
      :previewLanes="pianoPreviewLanes"
      :isPreviewEnabled="isPreviewEnabled"
      @notePressed="handlePianoPressed"
      @noteReleased="handlePianoReleased"
      @tonePlayed="handlePianoTonePlayed"
    />

    <SongRecorderAbcEditor
      v-model="abcText"
      :isImportDisabled="isTaking || isPlaybackRunning"
      :message="abcMessage"
      :sheetAbc="isReview ? sheet.abc : null"
      class="max-w-180"
      @import="importAbc"
      @edit="abcMessage = null"
    />

    <slot />
  </div>
</template>

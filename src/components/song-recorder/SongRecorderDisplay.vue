<script setup lang="ts">
import { midiToNoteLabel, type NoteInfo } from '@/utils/noteUtils'
import SongRecorderAbcExport from './SongRecorderAbcExport.vue'
import SongRecorderSettingsRow from './SongRecorderSettingsRow.vue'
import SongRecorderSheet from './SongRecorderSheet.vue'
import { BEATS_PER_BAR, type Grid } from './songRecorderConstants'
import { useSongRecorder, type PitchDetectionInput } from './useSongRecorder'

type Props = {
  detection: PitchDetectionInput & {
    noteInfo: Readonly<Ref<NoteInfo | null>>
  }
}

const props = defineProps<Props>()

const bpm = defineModel<number>('bpm', { required: true })
const grid = defineModel<Grid>('grid', { required: true })
const isClickEnabled = defineModel<boolean>('isClickEnabled', {
  required: true,
})

const { t } = useI18n()

const recorder = useSongRecorder({
  detection: props.detection,
  bpm,
  grid,
  isClickEnabled,
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
  activePieceIndex,
  hasPlayedToEnd,
  record,
  stop,
  play,
  pause,
  resume,
  stopPlayback,
  reset,
} = recorder

const isTaking = computed(() => isCountingIn.value || isRecording.value)
const isPlaybackRunning = computed(() => isPlaying.value || isPaused.value)

const liveNoteLabel = computed(() => {
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

/* Exposed for the test page's scripted demo melody. */
defineExpose({ recorder })
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-400 flex-1 flex-col items-center gap-4 px-2 pb-4"
    data-testid="song-recorder-display"
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
      v-model:isClickEnabled="isClickEnabled"
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
        class="min-w-24"
        data-testid="song-recorder-record"
        @click="record"
      />
      <PrimeButton
        v-if="isTaking"
        severity="danger"
        size="small"
        rounded
        icon="pi pi-stop"
        :label="t('generic.stop')"
        class="min-w-24"
        data-testid="song-recorder-stop"
        @click="stop"
      />

      <template v-if="isReview">
        <PrimeButton
          v-if="!isPlaybackRunning"
          severity="success"
          size="small"
          rounded
          icon="pi pi-play"
          :label="t('generic.play')"
          :disabled="!hasNotes"
          class="min-w-20"
          data-testid="song-recorder-play"
          @click="play"
        />
        <PrimeButton
          v-if="isPlaying"
          severity="warn"
          size="small"
          rounded
          icon="pi pi-pause"
          :label="t('generic.pause')"
          class="min-w-20"
          data-testid="song-recorder-pause"
          @click="pause"
        />
        <PrimeButton
          v-if="isPaused"
          severity="success"
          size="small"
          rounded
          icon="pi pi-play"
          :label="t('generic.resume')"
          class="min-w-20"
          data-testid="song-recorder-resume"
          @click="resume"
        />
        <PrimeButton
          v-if="isPlaybackRunning"
          severity="danger"
          size="small"
          rounded
          icon="pi pi-stop"
          :label="t('generic.stop')"
          class="min-w-20"
          data-testid="song-recorder-stop-playback"
          @click="stopPlayback"
        />
        <PrimeButton
          severity="secondary"
          size="small"
          rounded
          icon="pi pi-refresh"
          :label="t('songRecorder.newRecording')"
          data-testid="song-recorder-reset"
          @click="reset"
        />
      </template>
    </div>

    <p
      v-if="isIdle"
      class="max-w-prose text-center text-sm text-(--p-text-muted-color)"
    >
      {{ t('songRecorder.hint', { seconds: Math.round(limitMs / 1000) }) }}
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
      {{ t('songRecorder.noNotes') }}
    </p>

    <div class="w-full max-w-full">
      <SongRecorderSheet
        :abc="sheet.abc"
        :activePieceIndex="activePieceIndex"
        :isDone="hasPlayedToEnd"
        :followEnd="isRecording"
      />
    </div>

    <SongRecorderAbcExport
      v-if="isReview && hasNotes"
      :abc="sheet.abc"
      class="max-w-180"
    />

    <slot />
  </div>
</template>

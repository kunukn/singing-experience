<script setup lang="ts">
import { useFileDialog, useLocalStorage } from '@vueuse/core'

import type { NoteInfo } from '@/utils/noteUtils'

import type { TakeAnalysis } from './analyzeTake'
import ClearSingingProgress from './ClearSingingProgress.vue'
import LiveNoteReadout from './LiveNoteReadout.vue'
import LiveWaveform from './LiveWaveform.vue'
import { megabytesPerMinute, useRecordingBitDepth } from './recordingQuality'
import TakeAnalysisPanel from './TakeAnalysisPanel.vue'
import TakePlayer from './TakePlayer.vue'
import { MIN_RATED_VOICED_MS } from './takeRating'
import {
  MAX_UPLOAD_BYTES,
  MAX_UPLOAD_MS,
  type UploadErrorKey,
} from './uploadedTake'
import {
  MAX_RECORDING_MS,
  type RecorderErrorKey,
  type RecorderStatus,
  type Take,
} from './useVoiceRecorder'

type Props = {
  status: RecorderStatus
  elapsedMs: number
  take: Take | null
  errorKey: RecorderErrorKey | UploadErrorKey | null
  /* A picked file is being checked before it replaces the take. */
  isOpeningFile?: boolean
  liveStream?: MediaStream | null
  /* The test page supplies takes itself and never touches the microphone. */
  isSimulated?: boolean
  /* Results from an earlier visit to the page, restored with the take. */
  savedAnalysis?: TakeAnalysis | null
  /* The note heard by "See my voice" before recording. */
  previewNote?: NoteInfo | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  record: []
  stop: []
  clear: []
  upload: [file: File]
  analyzed: [analysis: TakeAnalysis]
}>()

const { t } = useI18n()
const { isPreviewEnabled } = useSettings()

const playerElement =
  useTemplateRef<InstanceType<typeof TakePlayer>>('playerElement')
const playheadMs = ref(0)
const showLiveNotes = useLocalStorage('syng.voiceRecorderLiveNotes', true)
const bitDepth = useRecordingBitDepth()
const qualityOptions = computed(() =>
  (
    [
      { value: 16, label: t('voiceRecorder.quality.standard') },
      { value: 24, label: t('voiceRecorder.quality.studio') },
    ] as const
  ).map((option) => ({
    ...option,
    detail: t('voiceRecorder.quality.detail', {
      bits: option.value,
      megabytes: megabytesPerMinute(option.value),
    }),
  })),
)

watch(
  () => props.take,
  () => {
    playheadMs.value = 0
  },
)

const maxSeconds = MAX_RECORDING_MS / 1000
const maxUploadMinutes = MAX_UPLOAD_MS / 60_000
/* Only the upload errors use these; other messages ignore them. */
const errorParams = {
  minutes: maxUploadMinutes,
  megabytes: MAX_UPLOAD_BYTES / 1_000_000,
}
const hint = computed(() =>
  [
    t('voiceRecorder.hint', { seconds: maxSeconds }),
    t('voiceRecorder.upload.hint', { minutes: maxUploadMinutes }),
  ].join('\n'),
)

/* The browser's own file picker; reset lets the same file be picked again. */
const fileDialog = useFileDialog({
  accept: 'audio/*',
  multiple: false,
  reset: true,
})
fileDialog.onChange((files) => {
  const file = files?.[0]
  if (file) emit('upload', file)
})
const ratedSeconds = MIN_RATED_VOICED_MS / 1000
const isBusy = computed(() => props.status === 'starting')
const isRecording = computed(() => props.status === 'recording')
/* Clear singing heard in this recording, so singers know when a rating is
 * possible before they stop. */
const clearSingingSeconds = ref(0)

watch(isRecording, (recording) => {
  if (recording) clearSingingSeconds.value = 0
})
const showTake = computed(() => props.status === 'idle' && props.take !== null)
const canPreview = computed(
  () => !props.isSimulated && props.status === 'idle' && props.take === null,
)
const timeLeft = computed(() =>
  formatClock(Math.max(0, MAX_RECORDING_MS - props.elapsedMs)),
)
const stopMessageKey = computed(() => {
  if (props.take?.stopReason === 'limit') return 'voiceRecorder.stopped.limit'
  if (props.take?.stopReason === 'interrupted') {
    return 'voiceRecorder.stopped.interrupted'
  }

  return null
})

function formatClock(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')

  return `${minutes}:${seconds}`
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4"
    data-testid="voice-recorder-display"
    :data-status="status"
  >
    <p
      v-if="!isSimulated"
      class="text-sm whitespace-pre-line text-(--p-text-muted-color)"
    >
      {{ hint }}
    </p>

    <div v-if="!isSimulated" class="flex flex-wrap items-center gap-3">
      <PrimeButton
        v-if="isRecording"
        :label="t('generic.stop')"
        size="small"
        severity="danger"
        rounded
        data-testid="recorder-stop"
        @click="emit('stop')"
      />
      <PrimeButton
        v-else
        :label="t(take ? 'voiceRecorder.recordAgain' : 'voiceRecorder.record')"
        icon="pi pi-circle-fill"
        size="small"
        severity="danger"
        rounded
        :loading="isBusy"
        :disabled="isBusy || isOpeningFile"
        data-testid="recorder-record"
        @click="emit('record')"
      />
      <!-- Next to Record: the quality applies only to the next recording -->
      <PrimeSelectButton
        v-if="status === 'idle'"
        v-model="bitDepth"
        :options="qualityOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :aria-label="t('voiceRecorder.quality.label')"
        data-testid="recorder-quality"
        :data-bit-depth="bitDepth"
      >
        <template #option="{ option }">
          <span :title="option.detail" aria-hidden="true">
            {{ option.label }}
          </span>
          <span class="sr-only" data-testid="recorder-quality-description">
            {{ option.label }}, {{ option.detail }}
          </span>
        </template>
      </PrimeSelectButton>
      <PrimeButton
        v-if="take && !isRecording && !isBusy"
        :label="t('generic.clear')"
        icon="pi pi-trash"
        size="small"
        severity="secondary"
        rounded
        data-testid="recorder-clear"
        @click="emit('clear')"
      />
      <span
        v-if="isRecording"
        role="timer"
        class="flex items-center gap-2 text-sm text-(--p-text-muted-color) tabular-nums"
        data-testid="recorder-time-left"
      >
        <span
          class="size-2.5 rounded-full bg-(--p-red-500) motion-safe:animate-pulse"
          aria-hidden="true"
        />
        {{ t('voiceRecorder.timeLeft', { time: timeLeft }) }}
      </span>
      <ClearSingingProgress
        v-if="isRecording && liveStream"
        :seconds="clearSingingSeconds"
        :targetSeconds="ratedSeconds"
      />
      <PreviewToggle
        v-if="canPreview"
        v-model="isPreviewEnabled"
        labelFrom="always"
        data-testid="recorder-preview"
      />
      <ToggleIconButton
        v-if="isRecording"
        v-model="showLiveNotes"
        iconOn="pi pi-hashtag"
        iconOff="pi pi-hashtag"
        :label="t('voiceRecorder.liveNotes')"
        labelFrom="xs"
        data-testid="recorder-live-notes"
      />
      <PrimeButton
        v-if="!isRecording"
        :label="t('voiceRecorder.upload.choose')"
        icon="pi pi-upload"
        size="small"
        severity="secondary"
        rounded
        :loading="isOpeningFile"
        :disabled="isBusy || isOpeningFile"
        data-testid="recorder-upload"
        @click="fileDialog.open()"
      />
    </div>

    <LiveNoteReadout
      v-if="canPreview && isPreviewEnabled"
      :noteInfo="previewNote ?? null"
    />

    <LiveWaveform
      v-if="isRecording && liveStream"
      v-model:clearSingingSeconds="clearSingingSeconds"
      :stream="liveStream"
      :showNotes="showLiveNotes"
    />

    <p
      v-if="errorKey"
      class="text-sm text-(--p-red-400)"
      data-testid="recorder-error"
    >
      {{ t(errorKey, errorParams) }}
    </p>

    <template v-if="showTake && take">
      <p
        v-if="stopMessageKey"
        class="text-sm text-(--p-text-muted-color)"
        data-testid="recorder-stop-message"
      >
        {{ t(stopMessageKey) }}
      </p>
      <TakePlayer
        ref="playerElement"
        :key="take.recordedAt.getTime()"
        :blob="take.blob"
        :mimeType="take.mimeType"
        :recordedAt="take.recordedAt"
        @playheadChange="playheadMs = $event"
      />
      <TakeAnalysisPanel
        :key="`analysis-${take.recordedAt.getTime()}`"
        :blob="take.blob"
        :hasAutoGain="take.hasAutoGain"
        :source="take.source"
        :playheadMs="playheadMs"
        :showReadout="isSimulated"
        :savedAnalysis="savedAnalysis"
        @analyzed="emit('analyzed', $event)"
        @seek="playerElement?.seekTo($event)"
        @tonePlay="playerElement?.pause()"
      />
    </template>
  </div>
</template>

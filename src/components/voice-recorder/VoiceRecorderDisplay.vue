<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'

import type { TakeAnalysis } from './analyzeTake'
import LiveWaveform from './LiveWaveform.vue'
import TakeAnalysisPanel from './TakeAnalysisPanel.vue'
import TakePlayer from './TakePlayer.vue'
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
  errorKey: RecorderErrorKey | null
  liveStream?: MediaStream | null
  /* The test page supplies takes itself and never touches the microphone. */
  isSimulated?: boolean
  /* Results from an earlier visit to the page, restored with the take. */
  savedAnalysis?: TakeAnalysis | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  record: []
  stop: []
  clear: []
  analyzed: [analysis: TakeAnalysis]
}>()

const { t } = useI18n()

const playerElement =
  useTemplateRef<InstanceType<typeof TakePlayer>>('playerElement')
const playheadMs = ref(0)
const showLiveNotes = useLocalStorage('syng.voiceRecorderLiveNotes', true)

watch(
  () => props.take,
  () => {
    playheadMs.value = 0
  },
)

const maxMinutes = MAX_RECORDING_MS / 60_000
const isBusy = computed(
  () => props.status === 'starting' || props.status === 'stopping',
)
const isRecording = computed(() => props.status === 'recording')
const showTake = computed(() => props.status === 'idle' && props.take !== null)
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
      {{ t('voiceRecorder.hint', { minutes: maxMinutes }) }}
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
        :disabled="isBusy"
        data-testid="recorder-record"
        @click="emit('record')"
      />
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
      <ToggleIconButton
        v-model="showLiveNotes"
        iconOn="pi pi-hashtag"
        iconOff="pi pi-hashtag"
        :label="t('voiceRecorder.liveNotes')"
        labelFrom="xs"
        data-testid="recorder-live-notes"
      />
    </div>

    <LiveWaveform
      v-if="isRecording && liveStream"
      :stream="liveStream"
      :showNotes="showLiveNotes"
    />

    <p
      v-if="errorKey"
      class="text-sm text-(--p-red-400)"
      data-testid="recorder-error"
    >
      {{ t(errorKey) }}
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
        :playheadMs="playheadMs"
        :showReadout="isSimulated"
        :savedAnalysis="savedAnalysis"
        @analyzed="emit('analyzed', $event)"
        @seek="playerElement?.seekTo($event)"
        @scalePlay="playerElement?.pause()"
      />
    </template>
  </div>
</template>

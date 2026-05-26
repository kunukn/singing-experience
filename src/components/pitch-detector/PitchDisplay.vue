<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import type { NoteInfo } from '@/utils/noteUtils'
import { midiRangeToScaleNotes, NOTE_NAMES } from '@/utils/noteUtils'
import NoteDisplay from './NoteDisplay.vue'
import PitchHistoryChart from './PitchHistoryChart.vue'
import PitchIdleControls from './PitchIdleControls.vue'
import PitchStats from './PitchStats.vue'
import { usePitchReplay } from './usePitchReplay'

type Props = {
  noteInfo: NoteInfo | null
  frequency: number | null
  clarity: number
  isClean: boolean
  isListening: boolean
  midiMin?: number
  midiMax?: number
  previewMidi?: number | null
  previewNoteLabel?: string | null
  previewFrequency?: number | null
  isPreviewEnabled?: boolean
  previewNoteInfoFull?: NoteInfo | null
  previewClarity?: number
  previewIsClean?: boolean
  previewRawFrequency?: number | null
  isMicPermissionGranted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  midiMin: 36,
  midiMax: 96,
  previewMidi: null,
  previewNoteLabel: null,
  previewFrequency: null,
  isPreviewEnabled: false,
  previewNoteInfoFull: null,
  previewClarity: 0,
  previewIsClean: false,
  previewRawFrequency: null,
  isMicPermissionGranted: true,
})

const emit = defineEmits<{
  tonePlayed: []
}>()

const { t } = useI18n()

const {
  isPlayingSequence,
  currentPlayingIndex,
  playSequence: startSequence,
  stopSequence,
} = useDoReMiPlaySequence()

const {
  isReplaying,
  replayProgress,
  replayElapsedSeconds,
  replayPitchHistory,
  stopReplay,
} = usePitchReplay()

const hasSamples = ref(false)
const replaySpeed = ref<1 | 2>(1)

const listenElapsedSeconds = ref<string | null>(null)
const recordedDurationSeconds = ref<string | null>(null)
let listenStartWall = 0
let listenRafId: number | null = null

function stopListenTimer() {
  if (listenRafId !== null) {
    cancelAnimationFrame(listenRafId)
    listenRafId = null
  }
}

function tickListenTimer() {
  const elapsedMs = performance.now() - listenStartWall
  listenElapsedSeconds.value = (elapsedMs / 1000).toFixed(1)
  listenRafId = requestAnimationFrame(tickListenTimer)
}

watch(
  () => props.isListening,
  (listening) => {
    if (listening) {
      hasSamples.value = false
      recordedDurationSeconds.value = null
      stopReplay()
      listenStartWall = performance.now()
      listenElapsedSeconds.value = '0.0'
      stopListenTimer()
      listenRafId = requestAnimationFrame(tickListenTimer)
    } else {
      stopListenTimer()
      listenElapsedSeconds.value = null
      nextTick(() => {
        const samples = pitchChartRef.value?.getSamples() ?? []
        hasSamples.value = samples.length > 0
        if (samples.length > 0) {
          const durationMs =
            samples[samples.length - 1].timestamp - samples[0].timestamp
          recordedDurationSeconds.value = (durationMs / 1000).toFixed(1)
        } else {
          recordedDurationSeconds.value = null
        }
      })
    }
  },
)

onUnmounted(() => {
  stopListenTimer()
})

const timerLabel = computed<string | null>(() => {
  if (isReplaying.value) {
    const current = replayElapsedSeconds.value
    if (current == null) return null

    const total = recordedDurationSeconds.value

    return total != null ? `${current}s / ${total}s` : `${current}s`
  }
  if (props.isListening) {
    const current = listenElapsedSeconds.value

    return current != null ? `${current}s` : null
  }
  if (hasSamples.value) {
    const total = recordedDurationSeconds.value

    return total != null ? `${total}s` : null
  }

  return null
})

function clearRecording() {
  stopReplay()
  pitchChartRef.value?.clearSamples()
  hasSamples.value = false
  recordedDurationSeconds.value = null
}

function toggleReplay() {
  if (isReplaying.value) {
    stopReplay()
  } else {
    const samples = pitchChartRef.value?.getSamples() ?? []
    if (samples.length > 0) {
      replayPitchHistory(samples, { speed: replaySpeed.value })
    }
  }
}

const pitchChartRef = ref<InstanceType<typeof PitchHistoryChart> | null>(null)

const rangeNotes = computed(() => {
  const count = pitchChartRef.value?.gridNoteCount ?? 5

  return midiRangeToScaleNotes(props.midiMin, props.midiMax, count)
})

const highlightedMidi = computed(() => {
  const idx = currentPlayingIndex.value
  if (idx < 0 || idx >= rangeNotes.value.length) return null

  const n = rangeNotes.value[idx]
  const noteIndex = NOTE_NAMES.indexOf(n.note)

  return (n.octave + 1) * 12 + noteIndex
})

function playSequence() {
  if (isPlayingSequence.value) {
    stopSequence()
    return
  }

  emit('tonePlayed')
  startSequence(rangeNotes.value)
}

type ReadoutSource = 'live' | 'preview' | 'none'

const readoutSource = computed<ReadoutSource>(() => {
  if (props.isListening) return 'live'
  /* A finished recording owns the cell so the Replay controls stay reachable,
   * even if preview is on or a clean note is still lingering. */
  if (hasSamples.value) return 'none'
  if (props.noteInfo && props.isClean) return 'live'
  if (
    props.isPreviewEnabled &&
    props.isMicPermissionGranted &&
    !isPlayingSequence.value
  )
    return 'preview'

  return 'none'
})

const showReadout = computed(() => readoutSource.value !== 'none')

const readoutNoteInfo = computed(() =>
  readoutSource.value === 'preview'
    ? props.previewNoteInfoFull
    : props.noteInfo,
)

const readoutIsClean = computed(() =>
  readoutSource.value === 'preview' ? props.previewIsClean : props.isClean,
)

const readoutFrequency = computed(() =>
  readoutSource.value === 'preview'
    ? props.previewRawFrequency
    : props.frequency,
)

const readoutClarity = computed(() =>
  readoutSource.value === 'preview' ? props.previewClarity : props.clarity,
)

defineExpose({ stopSequence, stopReplay, isPlayingSequence })
</script>

<template>
  <div class="flex w-full flex-1 flex-col gap-4">
    <div class="relative grid w-full items-center justify-center">
      <div
        class="flex w-full items-center justify-around gap-2 [grid-area:1/1] sm:gap-4"
        :class="showReadout ? 'visible' : 'pointer-events-none invisible'"
      >
        <CentsDeviationBar
          :cents="
            readoutNoteInfo && readoutIsClean ? readoutNoteInfo.cents : null
          "
          :threshold="10"
          :maxRange="100"
          :isVisible="showReadout"
          :highLabel="t('pitchDetector.sharp')"
          :lowLabel="t('pitchDetector.flat')"
          height="h-30 sm:h-40"
        />

        <NoteDisplay :noteInfo="readoutNoteInfo" :isClean="readoutIsClean" />

        <PitchStats
          :frequency="readoutFrequency"
          :clarity="readoutClarity"
          :isListening="showReadout"
        />
      </div>

      <PitchIdleControls
        :showReadout="showReadout"
        :isPlayingSequence="isPlayingSequence"
        :hasSamples="hasSamples"
        :isReplaying="isReplaying"
        :replaySpeed="replaySpeed"
        @playSequence="playSequence"
        @toggleReplay="toggleReplay"
        @clearRecording="clearRecording"
        @update:replaySpeed="(speed) => (replaySpeed = speed)"
      />

      <span
        v-if="timerLabel != null"
        data-testid="pitch-timer"
        class="pointer-events-none absolute inset-e-2 top-0 font-mono text-sm text-(--p-text-muted-color) tabular-nums"
      >
        ⏱ {{ timerLabel }}
      </span>
    </div>

    <!-- Pitch history chart -->
    <PitchHistoryChart
      ref="pitchChartRef"
      :noteInfo="noteInfo"
      :isListening="isListening"
      :isClean="isClean"
      :midiMin="props.midiMin"
      :midiMax="props.midiMax"
      :highlightedMidi="highlightedMidi"
      :replayProgress="replayProgress"
      :previewMidi="props.previewMidi"
      :previewNoteLabel="props.previewNoteLabel"
      :previewFrequency="props.previewFrequency"
      @tonePlayed="emit('tonePlayed')"
    />
  </div>
</template>

<style scoped lang="css"></style>

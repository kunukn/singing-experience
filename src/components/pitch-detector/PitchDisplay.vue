<script setup lang="ts">
import { useDoReMiPlaySequence } from '@/components/do-re-mi/useDoReMiPlaySequence'
import { midiRangeToScaleNotes, NOTE_NAMES } from '@/utils/noteUtils'
import PitchHistoryChart from './PitchHistoryChart.vue'
import PitchIdleControls from './PitchIdleControls.vue'
import PitchReadout from './PitchReadout.vue'
import type { PitchSample } from './pitchLaneRecorder'
import type {
  PitchLaneDetection,
  PitchLaneId,
  PitchPreviewLane,
} from './pitchLanes'
import { usePitchReplay } from './usePitchReplay'

type Props = {
  /* One entry per singing voice, already resolved by the parent to whichever
   * detector is live (the recorder while listening, the idle preview when
   * not). One 'low' lane in single-voice mode, both lanes in duet. */
  laneDetections?: PitchLaneDetection[]
  previewLanes?: PitchPreviewLane[]
  isListening: boolean
  midiMin?: number
  midiMax?: number
  isPreviewEnabled?: boolean
  isMicPermissionGranted?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  laneDetections: () => [],
  previewLanes: () => [],
  midiMin: 36,
  midiMax: 96,
  isPreviewEnabled: false,
  isMicPermissionGranted: true,
})

const emit = defineEmits<{
  tonePlayed: []
}>()

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

/* The wall-clock span of a finished recording, across every voice in it — a
 * duet lasts from whoever came in first to whoever finished last. */
function recordedSpanMs(
  lanes: Record<PitchLaneId, PitchSample[]>,
): number | null {
  const recorded = Object.values(lanes).filter((samples) => samples.length > 0)
  if (recorded.length === 0) return null

  const first = Math.min(...recorded.map((samples) => samples[0].timestamp))
  const last = Math.max(
    ...recorded.map((samples) => samples[samples.length - 1].timestamp),
  )

  return last - first
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
        const lanes = pitchChartRef.value?.getSamples() ?? { low: [], high: [] }
        const spanMs = recordedSpanMs(lanes)
        hasSamples.value = spanMs !== null
        recordedDurationSeconds.value =
          spanMs === null ? null : (spanMs / 1000).toFixed(1)
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

    return
  }

  const lanes = pitchChartRef.value?.getSamples()
  if (!lanes) return

  replayPitchHistory(lanes, { speed: replaySpeed.value })
}

const pitchChartRef = ref<InstanceType<typeof PitchHistoryChart> | null>(null)

const rangeNotes = computed(() => {
  const count = pitchChartRef.value?.gridNoteCount ?? 5

  return midiRangeToScaleNotes(props.midiMin, props.midiMax, count)
})

const highlightedMidi = computed(() => {
  const index = currentPlayingIndex.value
  if (index < 0 || index >= rangeNotes.value.length) return null

  const note = rangeNotes.value[index]
  const noteIndex = NOTE_NAMES.indexOf(note.note)

  return (note.octave + 1) * 12 + noteIndex
})

function playSequence() {
  if (isPlayingSequence.value) {
    stopSequence()
    return
  }

  emit('tonePlayed')
  startSequence(rangeNotes.value)
}

/*
 * Whether the readout row owns the cell. A finished recording takes it instead,
 * so the Replay controls stay reachable even if the preview is on or a clean
 * note is still lingering.
 */
const showReadout = computed(() => {
  if (props.isListening) return true
  if (hasSamples.value) return false
  if (props.laneDetections.some((lane) => lane.noteInfo && lane.isClean))
    return true

  return (
    props.isPreviewEnabled &&
    props.isMicPermissionGranted &&
    !isPlayingSequence.value
  )
})

/* Duet shows two columns, so both shrink a step and each says whose voice it
 * is; a single voice keeps the full-size, unlabelled readout. */
const isDuet = computed(() => props.laneDetections.length > 1)

defineExpose({ stopSequence, stopReplay, isPlayingSequence })
</script>

<template>
  <div class="flex w-full flex-1 flex-col gap-4">
    <div class="relative grid w-full items-center justify-center">
      <div
        class="flex w-full items-center justify-around gap-2 [grid-area:1/1] sm:gap-4"
        :class="showReadout ? 'visible' : 'pointer-events-none invisible'"
      >
        <PitchReadout
          v-for="lane in props.laneDetections"
          :key="lane.laneId"
          :noteInfo="lane.noteInfo"
          :isClean="lane.isClean"
          :frequency="lane.frequency"
          :clarity="lane.clarity"
          :isVisible="showReadout"
          :laneId="isDuet ? lane.laneId : undefined"
          :isCompact="isDuet"
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
      :laneDetections="props.laneDetections"
      :previewLanes="props.previewLanes"
      :isListening="isListening"
      :midiMin="props.midiMin"
      :midiMax="props.midiMax"
      :highlightedMidi="highlightedMidi"
      :replayProgress="replayProgress"
      @tonePlayed="emit('tonePlayed')"
    />
  </div>
</template>

<style scoped lang="css"></style>

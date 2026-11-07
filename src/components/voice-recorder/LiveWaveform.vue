<script setup lang="ts">
import { useRafFn, useResizeObserver } from '@vueuse/core'

import { resolveCssColor } from '@/utils/cssColor'
import { rootMeanSquare } from '@/utils/duetBandSplit'
import type { NoteInfo } from '@/utils/noteUtils'

import LiveNoteReadout from './LiveNoteReadout.vue'
import { createLivePitchReader } from './livePitch'
import { createClearSingingCounter, displaySeconds } from './liveSingingTime'
import {
  createNoSoundWatch,
  findRisingZeroCrossing,
  isSoundLevel,
  shapeSampleForDisplay,
} from './liveWaveform'

const HEIGHT_PX = 96
/* About 43 ms at 48 kHz: the search below uses half and the curve the other half,
 * which shows 4 or 5 cycles of a typical sung note. */
const ANALYSER_SAMPLES = 2048
const VISIBLE_SAMPLES = ANALYSER_SAMPLES / 2
/* Leaves a little air so the loudest peaks aren't cut off by the edge. */
const AMPLITUDE_RATIO = 0.45

type Props = {
  stream: MediaStream
  showNotes: boolean
}

const props = defineProps<Props>()
/* Whole seconds only, so the parent isn't updated on every frame. */
const clearSingingSeconds = defineModel<number>('clearSingingSeconds', {
  default: 0,
})

const { t } = useI18n()
const { clarityThreshold } = useSettings()

const canvasElement = useTemplateRef<HTMLCanvasElement>('canvasElement')
const width = ref(0)
const hasNoSound = ref(false)
const isHearingSound = ref(false)
const noteInfo = shallowRef<NoteInfo | null>(null)

/* Only ever read, never connected to the speakers, so singers don't hear
 * themselves back and it can't reach the recording. */
const audioContext = new AudioContext()
const analyser = audioContext.createAnalyser()
analyser.fftSize = ANALYSER_SAMPLES
const source = audioContext.createMediaStreamSource(props.stream)
source.connect(analyser)
/* Created after awaiting the mic, so iOS may not count it as started by a tap. */
void audioContext.resume().catch(() => {})

const samples = new Float32Array(ANALYSER_SAMPLES)
const noSoundWatch = createNoSoundWatch(performance.now())
const pitchReader = createLivePitchReader(ANALYSER_SAMPLES)
const singingCounter = createClearSingingCounter()

/* Turning notes back on must not start from the note shown before. */
watch(
  () => props.showNotes,
  () => {
    pitchReader.reset()
    noteInfo.value = null
  },
)

function listen() {
  analyser.getFloatTimeDomainData(samples)

  const nowMs = performance.now()
  const rms = rootMeanSquare(samples)
  hasNoSound.value = noSoundWatch.update(rms, nowMs)
  isHearingSound.value = isSoundLevel(rms)

  /* Detected even with notes hidden: the singing time still counts. */
  const [pitchHz, clarity] = pitchReader.detect(
    samples,
    audioContext.sampleRate,
  )
  singingCounter.push(
    { pitchHz, clarity, isSound: isHearingSound.value },
    nowMs,
  )
  const seconds = displaySeconds(singingCounter.clearMs)
  if (seconds !== clearSingingSeconds.value) clearSingingSeconds.value = seconds

  if (props.showNotes) {
    noteInfo.value = pitchReader.readDetected(
      pitchHz,
      clarity,
      clarityThreshold.value,
      nowMs,
    )
  }
}

function draw() {
  /* Before the canvas check, so a hidden or unsized canvas can't stop the count. */
  listen()

  const canvas = canvasElement.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context || width.value === 0) return

  const dpr = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width.value * dpr)
  const pixelHeight = Math.round(HEIGHT_PX * dpr)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  context.clearRect(0, 0, width.value, HEIGHT_PX)

  const middle = HEIGHT_PX / 2
  const start = findRisingZeroCrossing(
    samples,
    ANALYSER_SAMPLES - VISIBLE_SAMPLES,
  )

  context.strokeStyle = resolveCssColor(
    isHearingSound.value ? '--p-primary-color' : '--p-text-muted-color',
    '#888888',
  )
  context.lineWidth = 2
  context.lineJoin = 'round'
  context.beginPath()

  for (let i = 0; i < VISIBLE_SAMPLES; i++) {
    const x = (i / (VISIBLE_SAMPLES - 1)) * width.value
    const y =
      middle -
      shapeSampleForDisplay(samples[start + i]) * HEIGHT_PX * AMPLITUDE_RATIO

    if (i === 0) {
      context.moveTo(x, y)
    } else {
      context.lineTo(x, y)
    }
  }

  context.stroke()
}

useRafFn(draw)

useResizeObserver(canvasElement, ([entry]) => {
  width.value = entry.contentRect.width
})

onBeforeUnmount(() => {
  source.disconnect()
  void audioContext.close().catch(() => {})
})
</script>

<template>
  <div class="flex flex-col gap-2">
    <canvas
      ref="canvasElement"
      role="img"
      :aria-label="t('voiceRecorder.waveformLabel')"
      class="block w-full rounded-lg border border-(--p-content-border-color) bg-(--p-content-background)"
      :style="{ height: `${HEIGHT_PX}px` }"
      data-testid="live-waveform"
      :data-hearing="isHearingSound"
    />
    <LiveNoteReadout v-if="showNotes" :noteInfo="noteInfo" />
    <p
      v-if="hasNoSound"
      role="status"
      class="text-sm text-(--p-orange-400)"
      data-testid="live-waveform-no-sound"
    >
      {{ t('voiceRecorder.noSoundYet') }}
    </p>
  </div>
</template>

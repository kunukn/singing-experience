<script setup lang="ts">
import { useObjectUrl, useRafFn } from '@vueuse/core'

import { takeFileName } from './recorderFormat'

/* Past any real recording, so the browser has to work out where the end is. */
const SEEK_PAST_END_SECONDS = 1e101

type Props = {
  blob: Blob
  mimeType: string
  recordedAt: Date
}

const props = defineProps<Props>()

const emit = defineEmits<{
  playheadChange: [playheadMs: number]
}>()

const { t } = useI18n()

const audioElement = useTemplateRef<HTMLAudioElement>('audioElement')
const audioUrl = useObjectUrl(() => props.blob)
const fileName = computed(() => takeFileName(props.mimeType, props.recordedAt))

let isFindingDuration = false

/*
 * MediaRecorder WebM files carry no duration header, so Chromium reports
 * Infinity and the native scrubber can't seek. Seeking past the end makes the
 * browser scan the file and report the real length, then we rewind.
 */
function handleLoadedMetadata() {
  const audio = audioElement.value
  if (!audio || Number.isFinite(audio.duration)) return

  isFindingDuration = true
  audio.currentTime = SEEK_PAST_END_SECONDS
}

function handleDurationChange() {
  const audio = audioElement.value
  if (!audio || !isFindingDuration || !Number.isFinite(audio.duration)) return

  isFindingDuration = false
  audio.currentTime = 0
}

function emitPlayhead() {
  const audio = audioElement.value
  if (audio && !isFindingDuration) {
    emit('playheadChange', audio.currentTime * 1000)
  }
}

/* timeupdate only fires about 4 times a second: too coarse for a playhead. */
const playheadLoop = useRafFn(emitPlayhead, { immediate: false })

function seekTo(playheadMs: number) {
  const audio = audioElement.value
  if (!audio) return

  audio.currentTime = playheadMs / 1000
  emitPlayhead()
}

defineExpose({ seekTo })
</script>

<template>
  <div class="flex flex-wrap items-center gap-3" data-testid="take-player">
    <audio
      ref="audioElement"
      :src="audioUrl"
      controls
      preload="metadata"
      class="min-w-0 flex-1 basis-64"
      @loadedmetadata="handleLoadedMetadata"
      @durationchange="handleDurationChange"
      @play="playheadLoop.resume()"
      @pause="playheadLoop.pause()"
      @ended="playheadLoop.pause()"
      @seeked="emitPlayhead"
    />
    <PrimeButton
      as="a"
      :href="audioUrl"
      :download="fileName"
      :label="t('voiceRecorder.download')"
      icon="pi pi-download"
      size="small"
      severity="secondary"
      rounded
      data-testid="take-download"
    />
  </div>
</template>

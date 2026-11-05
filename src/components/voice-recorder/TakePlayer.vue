<script setup lang="ts">
import { useObjectUrl, useRafFn } from '@vueuse/core'

import { compressTake, SMALL_FILE_MIME_TYPE } from './compressTake'
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

/* Takes from the older MediaRecorder version are already compressed. */
const canMakeSmallFile = computed(() => props.mimeType.startsWith('audio/wav'))
const smallFile = shallowRef<Blob | null>(null)
const smallFileUrl = useObjectUrl(smallFile)
const isMakingSmallFile = ref(false)
const hasSmallFileFailed = ref(false)

watch(
  () => props.blob,
  () => {
    smallFile.value = null
    hasSmallFileFailed.value = false
  },
)

function saveFile(url: string, name: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
}

/* Encoded on first tap, then reused for this take. */
async function downloadSmallFile() {
  if (isMakingSmallFile.value) return

  hasSmallFileFailed.value = false
  if (!smallFile.value) {
    const sourceBlob = props.blob
    isMakingSmallFile.value = true
    try {
      const compressed = await compressTake(sourceBlob)
      /* A new take arrived while this one was encoding. */
      if (sourceBlob !== props.blob) return

      smallFile.value = compressed
    } catch {
      hasSmallFileFailed.value = true

      return
    } finally {
      isMakingSmallFile.value = false
    }

    await nextTick()
  }

  if (smallFileUrl.value) {
    saveFile(
      smallFileUrl.value,
      takeFileName(SMALL_FILE_MIME_TYPE, props.recordedAt),
    )
  }
}

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

function pause() {
  audioElement.value?.pause()
}

defineExpose({ seekTo, pause })
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
    <!-- One wrap unit: the two downloads move to the next line together -->
    <div class="flex items-center gap-3" data-testid="take-downloads">
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
      <PrimeButton
        v-if="canMakeSmallFile"
        :label="t('voiceRecorder.smallFile')"
        icon="pi pi-download"
        size="small"
        severity="secondary"
        rounded
        :loading="isMakingSmallFile"
        data-testid="take-download-small"
        @click="downloadSmallFile"
      />
    </div>
    <p
      v-if="hasSmallFileFailed"
      role="alert"
      class="basis-full text-sm text-(--p-red-400)"
      data-testid="take-download-small-error"
    >
      {{ t('voiceRecorder.smallFileFailed') }}
    </p>
  </div>
</template>

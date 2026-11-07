<script setup lang="ts">
import { frequencyToNote } from '@/utils/noteUtils'

import { createUploadedTake, type UploadErrorKey } from './uploadedTake'
import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'
import { useVoiceRecorder } from './useVoiceRecorder'

const recorder = useVoiceRecorder()
const takeStore = useVoiceTakeStore()
const { isPreviewEnabled } = useSettings()

const isTakeRestored = ref(false)
const isPreparingToRecord = ref(false)
const isOpeningFile = ref(false)
const uploadErrorKey = ref<UploadErrorKey | null>(null)

void takeStore.restore().finally(() => {
  isTakeRestored.value = true
})

/* A shown take keeps the mic closed: on iOS an open mic plays it at quiet call
 * level, and the mic would hear the playback. Waiting for the restore stops the
 * mic opening for a moment before a saved take arrives. */
const { previewFrequency, previewMidi } = useIdlePreview({
  isGameActive: computed(
    () =>
      !isTakeRestored.value ||
      isPreparingToRecord.value ||
      recorder.status.value !== 'idle' ||
      takeStore.take !== null,
  ),
  isEnabled: isPreviewEnabled,
})

const previewNote = computed(() =>
  previewFrequency.value === null
    ? null
    : frequencyToNote(previewFrequency.value, previewMidi.value ?? undefined),
)

/*
 * Recording again replaces the take without asking: most takes are quick tries
 * that nobody means to keep.
 *
 * The preview's mic closes before the recorder's opens. Closing it while the
 * recorder's is still pending would leave no live stream, which moves iOS to the
 * 'playback' session and cuts capture. Closing it after would overlap two streams
 * with different constraints, and any resulting mute ends the take.
 */
async function handleRecord() {
  uploadErrorKey.value = null
  takeStore.clear()
  isPreparingToRecord.value = true
  await nextTick()
  await recorder.start()
  isPreparingToRecord.value = false
}

/* A file that can't be used leaves the current take alone, unlike recording
 * again. A recording started while the file was checked wins. */
async function handleUpload(file: File) {
  uploadErrorKey.value = null
  isOpeningFile.value = true
  const result = await createUploadedTake(file)
  isOpeningFile.value = false

  if ('errorKey' in result) {
    uploadErrorKey.value = result.errorKey

    return
  }

  if (recorder.status.value === 'idle') takeStore.setTake(result.take)
}
</script>

<template>
  <VoiceRecorderDisplay
    :status="recorder.status.value"
    :elapsedMs="recorder.elapsedMs.value"
    :take="takeStore.take"
    :errorKey="uploadErrorKey ?? recorder.errorKey.value"
    :isOpeningFile="isOpeningFile"
    :liveStream="recorder.liveStream.value"
    :savedAnalysis="takeStore.analysis"
    :previewNote="previewNote"
    @record="handleRecord"
    @stop="recorder.stop()"
    @upload="handleUpload"
    @clear="takeStore.clear()"
    @analyzed="takeStore.setAnalysis($event)"
  />
</template>

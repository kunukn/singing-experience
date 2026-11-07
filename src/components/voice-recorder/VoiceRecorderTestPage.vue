<script setup lang="ts">
import {
  createSyntheticTake,
  SYNTHETIC_PRESET_NAMES,
  type SyntheticPresetName,
} from './syntheticTake'
import type { Take, TakeOrigin } from './useVoiceRecorder'
import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'
import { encodeWav } from './wavEncoder'

const presetOptions = [...SYNTHETIC_PRESET_NAMES]
const presetName = ref<SyntheticPresetName>('steadyScale')
const take = shallowRef<Take | null>(null)

function createTake(blob: Blob, source: TakeOrigin): Take {
  return {
    blob,
    mimeType: blob.type,
    recordedAt: new Date(),
    stopReason: 'user',
    hasAutoGain: false,
    source,
  }
}

function loadPreset(name: SyntheticPresetName) {
  const { samples, sampleRate } = createSyntheticTake(name)

  take.value = createTake(encodeWav(samples, sampleRate), 'recorded')
}

/* For calibrating the scores against real singing, with no microphone. Marked
 * as uploaded so the analysis matches what a singer opening a file sees. */
function handleFileSelect(event: { files: File[] }) {
  const [file] = event.files
  if (file) take.value = createTake(file, 'uploaded')
}

watch(presetName, loadPreset, { immediate: true })
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4"
    data-testid="voice-recorder-test-page"
  >
    <h1 class="text-2xl font-semibold">Voice Recorder (Test)</h1>
    <div class="flex flex-wrap items-center gap-3">
      <PrimeSelect
        v-model="presetName"
        :options="presetOptions"
        size="small"
        data-testid="voice-recorder-preset"
      />
      <PrimeFileUpload
        mode="basic"
        accept="audio/*"
        customUpload
        chooseLabel="Load a file"
        data-testid="voice-recorder-file"
        @select="handleFileSelect"
      />
    </div>
    <VoiceRecorderDisplay
      status="idle"
      :elapsedMs="0"
      :take="take"
      :errorKey="null"
      isSimulated
    />
  </div>
</template>

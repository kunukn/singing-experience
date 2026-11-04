<script setup lang="ts">
import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'
import { useVoiceRecorder } from './useVoiceRecorder'

const recorder = useVoiceRecorder()
const takeStore = useVoiceTakeStore()

void takeStore.restore()

/* Recording again replaces the take without asking: most takes are quick tries
 * that nobody means to keep. */
function handleRecord() {
  takeStore.clear()
  void recorder.start()
}
</script>

<template>
  <VoiceRecorderDisplay
    :status="recorder.status.value"
    :elapsedMs="recorder.elapsedMs.value"
    :take="takeStore.take"
    :errorKey="recorder.errorKey.value"
    :liveStream="recorder.liveStream.value"
    :savedAnalysis="takeStore.analysis"
    @record="handleRecord"
    @stop="recorder.stop()"
    @clear="takeStore.clear()"
    @analyzed="takeStore.setAnalysis($event)"
  />
</template>

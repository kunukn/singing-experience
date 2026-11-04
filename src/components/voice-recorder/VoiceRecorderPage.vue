<script setup lang="ts">
import { useEventListener } from '@vueuse/core'
import { useHead } from '@unhead/vue'

import VoiceRecorderDisplay from './VoiceRecorderDisplay.vue'
import { useVoiceRecorder } from './useVoiceRecorder'

const { t } = useI18n()

/* Unlisted, so it stays out of ROUTE_META and search results alike. */
useHead({
  title: () => t('home.programs.voiceRecorder.name'),
  meta: [{ name: 'robots', content: 'noindex' }],
})

const recorder = useVoiceRecorder()
const isDownloaded = ref(false)

const hasUnsavedTake = computed(
  () => recorder.take.value !== null && !isDownloaded.value,
)

/* A take only lives in memory, so these are the moments it could be lost. */
function handleRecord() {
  if (
    hasUnsavedTake.value &&
    !window.confirm(t('voiceRecorder.confirmReplace'))
  ) {
    return
  }

  recorder.clearTake()
  isDownloaded.value = false
  void recorder.start()
}

onBeforeRouteLeave(() => {
  if (!hasUnsavedTake.value) return true

  return window.confirm(t('voiceRecorder.confirmLeave'))
})

useEventListener(window, 'beforeunload', (event: BeforeUnloadEvent) => {
  if (hasUnsavedTake.value) event.preventDefault()
})
</script>

<template>
  <VoiceRecorderDisplay
    :status="recorder.status.value"
    :elapsedMs="recorder.elapsedMs.value"
    :take="recorder.take.value"
    :errorKey="recorder.errorKey.value"
    @record="handleRecord"
    @stop="recorder.stop()"
    @download="isDownloaded = true"
  />
</template>

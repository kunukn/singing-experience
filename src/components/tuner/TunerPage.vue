<script setup lang="ts">
import UkuleleDisplay from '@/components/ukulele/UkuleleDisplay.vue'
import TunerDisplay from './TunerDisplay.vue'

type InstrumentType = 'guitar' | 'ukulele' | 'custom'

const selectedInstrument = ref<InstrumentType>('guitar')

const { t } = useI18n()

const instrumentOptions = computed(() => [
  { label: `🎸 ${t('tuner.guitar')}`, value: 'guitar' as InstrumentType },
  { label: `🪕 ${t('tuner.ukulele')}`, value: 'ukulele' as InstrumentType },
  /*{ label: `🎵 ${t('tuner.custom')}`, value: 'custom' as InstrumentType },*/
])

const { referenceA4 } = useReferencePitch()

const {
  frequency,
  noteInfo,
  clarity,
  isListening,
  isClean,
  error,
  start,
  stop,
  /* softRawAudio — noise suppression / AGC fight a steady plucked-string tone,
   * but echo cancellation stays on because the guitar/uke sampler plays through
   * the speaker while the mic listens. */
} = usePitchDetection({ softRawAudio: true, referenceA4 })

watch(selectedInstrument, () => {
  stop()
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-2">
    <PrimeSelectButton
      :modelValue="selectedInstrument"
      @update:modelValue="selectedInstrument = $event"
      :options="instrumentOptions"
      optionLabel="label"
      optionValue="value"
      :allowEmpty="false"
    />

    <TunerDisplay
      v-if="selectedInstrument === 'guitar'"
      :noteInfo="noteInfo"
      :frequency="frequency"
      :clarity="clarity"
      :isClean="isClean"
      :isListening="isListening"
      :error="error"
      :start="start"
      :stop="stop"
      v-model:referenceA4="referenceA4"
    />
    <UkuleleDisplay
      v-else-if="selectedInstrument === 'ukulele'"
      :noteInfo="noteInfo"
      :frequency="frequency"
      :clarity="clarity"
      :isClean="isClean"
      :isListening="isListening"
      :error="error"
      :start="start"
      :stop="stop"
      v-model:referenceA4="referenceA4"
    />
    <div v-else-if="selectedInstrument === 'custom'">TODO</div>
    <div v-else>ERROR IN App</div>
  </div>
</template>

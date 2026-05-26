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

const {
  frequency,
  noteInfo,
  clarity,
  isListening,
  isClean,
  error,
  start,
  stop,
} = usePitchDetection()

watch(selectedInstrument, () => {
  stop()
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex flex-col items-center gap-2">
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
    />
    <div v-else-if="selectedInstrument === 'custom'">TODO</div>
    <div v-else>ERROR IN App</div>
  </div>
</template>

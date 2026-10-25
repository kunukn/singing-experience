<script setup lang="ts">
import UkuleleDisplay from '@/components/ukulele/UkuleleDisplay.vue'
import TunerDisplay from './TunerDisplay.vue'

const route = useRoute()
const router = useRouter()

const TAB_VALUES = ['guitar', 'ukulele'] as const
type TunerTab = (typeof TAB_VALUES)[number]
const DEFAULT_TAB: TunerTab = 'guitar'

/* Active instrument lives only in the URL (?tab=guitar|ukulele), as on /notes.
 * Unknown/missing values fall back to guitar. replace() keeps instrument
 * switches out of the browser history. */
const selectedInstrument = computed<TunerTab>({
  get() {
    const tab = route.query.tab
    return TAB_VALUES.includes(tab as TunerTab)
      ? (tab as TunerTab)
      : DEFAULT_TAB
  },
  set(tab) {
    router.replace({ query: { ...route.query, tab } })
  },
})

const { t } = useI18n()

const instrumentOptions = computed(() => [
  { label: `🎸 ${t('tuner.guitar')}`, value: 'guitar' as TunerTab },
  { label: `🪕 ${t('tuner.ukulele')}`, value: 'ukulele' as TunerTab },
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
      v-else
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
  </div>
</template>

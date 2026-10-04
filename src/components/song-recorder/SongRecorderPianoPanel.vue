<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { PIANO_DEFAULT_RANGE_LABEL_KEY } from './songRecorderConstants'

type Props = {
  /* Piano is the take's input — opening the panel is then the obvious next step. */
  isPianoInput: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  notePressed: [midi: number, timeStamp: number]
  noteReleased: [midi: number, timeStamp: number]
  tonePlayed: [midi: number]
}>()

const { t } = useI18n()

const isExpanded = useLocalStorage('syng.songRecorderPianoExpanded', false)

watch(
  () => props.isPianoInput,
  (isPiano) => {
    if (isPiano) isExpanded.value = true
  },
)

/* Own key, so the range picked here doesn't move the /piano page's range. */
const rangeIndex = useVoiceRangeIndex('syng.songRecorderPianoRange', {
  defaultLabelKey: PIANO_DEFAULT_RANGE_LABEL_KEY,
})
const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])
</script>

<template>
  <div class="flex w-full flex-col gap-2">
    <!-- Same column as the ABC editor below, so both toggles start at one edge. -->
    <div class="mx-auto flex w-full max-w-180 flex-col">
      <PrimeButton
        severity="secondary"
        text
        size="small"
        :icon="isExpanded ? 'pi pi-chevron-down' : 'pi pi-chevron-right'"
        :label="t('songRecorder.pianoLabel')"
        :aria-expanded="isExpanded"
        aria-controls="song-recorder-piano-body"
        class="self-start"
        data-testid="song-recorder-piano-toggle"
        @click="isExpanded = !isExpanded"
      />
    </div>

    <div
      v-show="isExpanded"
      id="song-recorder-piano-body"
      class="flex w-full flex-col gap-2"
    >
      <VoiceRangeSelect
        v-model:rangeIndex="rangeIndex"
        :headerLabel="t('songRecorder.pianoRange')"
        class="self-center"
        data-testid="song-recorder-piano-range"
      />
      <!-- v-if, not v-show: unmounting removes the keyboard's window key
       listener, so a folded-away piano can't be played (or recorded) by typing. -->
      <div v-if="isExpanded" class="mx-auto w-full max-w-400">
        <!-- No rangeIndex: it only drives the voice-type ribbon, which is
         about singers and has no place on an instrument you play. -->
        <PianoDisplay
          :midiMin="selectedRange.midiMin"
          :midiMax="selectedRange.midiMax"
          toneLabelMode="simple"
          :isOctaveShownOnC="true"
          @notePressed="
            (midi, timeStamp) => emit('notePressed', midi, timeStamp)
          "
          @noteReleased="
            (midi, timeStamp) => emit('noteReleased', midi, timeStamp)
          "
          @tonePlayed="(midi) => emit('tonePlayed', midi)"
        />
      </div>
    </div>
  </div>
</template>

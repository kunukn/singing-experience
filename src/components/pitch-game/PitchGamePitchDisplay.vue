<script setup lang="ts">
import type { NoteInfo } from '@/utils/noteUtils'
import PitchGamePitchHistoryChart from './PitchGamePitchHistoryChart.vue'
import type { GameTarget } from './usePitchGame'

type Props = {
  noteInfo: NoteInfo | null
  isClean: boolean
  isListening: boolean
  midiMin?: number
  midiMax?: number
  previewMidi?: number | null
  previewNoteLabel?: string | null
  previewFrequency?: number | null
  highlightedMidi?: number | null
  targets?: GameTarget[]
  simplifyChart?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  midiMin: 36,
  midiMax: 96,
  previewMidi: null,
  previewNoteLabel: null,
  previewFrequency: null,
  highlightedMidi: null,
  targets: () => [],
  simplifyChart: false,
})

const emit = defineEmits<{
  tonePlayed: []
}>()

const chartRef = ref<InstanceType<typeof PitchGamePitchHistoryChart> | null>(
  null,
)

function getTargetViewportOrigin(id: number) {
  return chartRef.value?.getTargetViewportOrigin(id) ?? null
}

defineExpose({ getTargetViewportOrigin })
</script>

<template>
  <div class="flex w-full flex-1 flex-col gap-4">
    <PitchGamePitchHistoryChart
      ref="chartRef"
      :noteInfo="noteInfo"
      :isListening="isListening"
      :isClean="isClean"
      :midiMin="props.midiMin"
      :midiMax="props.midiMax"
      :previewMidi="props.previewMidi"
      :previewNoteLabel="props.previewNoteLabel"
      :previewFrequency="props.previewFrequency"
      :highlightedMidi="props.highlightedMidi"
      :targets="props.targets"
      :simplifyChart="props.simplifyChart"
      @tonePlayed="emit('tonePlayed')"
    />
  </div>
</template>

<style scoped lang="css"></style>

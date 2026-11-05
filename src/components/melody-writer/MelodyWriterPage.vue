<script setup lang="ts">
import {
  CLEF_LABEL_KEYS,
  type ClefKey,
} from '@/components/notes/notesConstants'
import { useLocalStorage } from '@vueuse/core'
import MelodyWriterDisplay from './MelodyWriterDisplay.vue'
import {
  ALLOWED_BPMS,
  DEFAULT_BPM,
  DEFAULT_CLEF,
  DEFAULT_GRID,
  DEFAULT_INPUT,
  GRID_OPTIONS,
  INPUT_OPTIONS,
  type Grid,
  type MelodyWriterInput,
} from './melodyWriterConstants'

const detection = usePitchDetection({ softRawAudio: true })

const bpm = useLocalStorage('syng.melodyWriterBpm', DEFAULT_BPM)
if (!(ALLOWED_BPMS as readonly number[]).includes(bpm.value)) {
  bpm.value = DEFAULT_BPM
}

const grid = useLocalStorage<Grid>('syng.melodyWriterGrid', DEFAULT_GRID)
if (!(GRID_OPTIONS as readonly number[]).includes(grid.value)) {
  grid.value = DEFAULT_GRID
}

const clef = useLocalStorage<ClefKey>('syng.melodyWriterClef', DEFAULT_CLEF)
if (!(CLEF_LABEL_KEYS as readonly string[]).includes(clef.value)) {
  clef.value = DEFAULT_CLEF
}

const isClickEnabled = useLocalStorage('syng.melodyWriterClick', true)

const input = useLocalStorage<MelodyWriterInput>(
  'syng.melodyWriterInput',
  DEFAULT_INPUT,
)
if (!(INPUT_OPTIONS as readonly string[]).includes(input.value)) {
  input.value = DEFAULT_INPUT
}

const toneLabelMode = useToneLabelMode(
  'syng.melodyWriterToneLabelMode',
  'simple',
)
</script>

<template>
  <MelodyWriterDisplay
    :detection="detection"
    v-model:bpm="bpm"
    v-model:grid="grid"
    v-model:clef="clef"
    v-model:isClickEnabled="isClickEnabled"
    v-model:input="input"
    v-model:toneLabelMode="toneLabelMode"
  />
</template>

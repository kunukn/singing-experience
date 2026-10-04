<script setup lang="ts">
import {
  CLEF_LABEL_KEYS,
  type ClefKey,
} from '@/components/notes/notesConstants'
import { useLocalStorage } from '@vueuse/core'
import SongRecorderDisplay from './SongRecorderDisplay.vue'
import {
  ALLOWED_BPMS,
  DEFAULT_BPM,
  DEFAULT_CLEF,
  DEFAULT_GRID,
  GRID_OPTIONS,
  type Grid,
} from './songRecorderConstants'

const detection = usePitchDetection({ softRawAudio: true })

const bpm = useLocalStorage('syng.songRecorderBpm', DEFAULT_BPM)
if (!(ALLOWED_BPMS as readonly number[]).includes(bpm.value)) {
  bpm.value = DEFAULT_BPM
}

const grid = useLocalStorage<Grid>('syng.songRecorderGrid', DEFAULT_GRID)
if (!(GRID_OPTIONS as readonly number[]).includes(grid.value)) {
  grid.value = DEFAULT_GRID
}

const clef = useLocalStorage<ClefKey>('syng.songRecorderClef', DEFAULT_CLEF)
if (!(CLEF_LABEL_KEYS as readonly string[]).includes(clef.value)) {
  clef.value = DEFAULT_CLEF
}

const isClickEnabled = useLocalStorage('syng.songRecorderClick', true)
</script>

<template>
  <SongRecorderDisplay
    :detection="detection"
    v-model:bpm="bpm"
    v-model:grid="grid"
    v-model:clef="clef"
    v-model:isClickEnabled="isClickEnabled"
  />
</template>

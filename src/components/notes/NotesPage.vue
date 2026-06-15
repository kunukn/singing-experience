<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import NotesListenDisplay from './NotesListenDisplay.vue'
import NotesSingDisplay from './NotesSingDisplay.vue'
import { ALLOWED_BPMS, DEFAULT_BPM } from './notesConstants'
import { NOTE_SCALES } from './notesScales'
import { useNotesPlayback } from './useNotesPlayback'

const { t } = useI18n()

const CLEF_COUNT = NOTE_SCALES.length
const DEFAULT_CLEF_INDEX = 0 // G clef

const clefIndex = useLocalStorage('syng.notesClefIndex', DEFAULT_CLEF_INDEX)
if (
  typeof clefIndex.value !== 'number' ||
  !Number.isInteger(clefIndex.value) ||
  clefIndex.value < 0 ||
  clefIndex.value >= CLEF_COUNT
) {
  clefIndex.value = DEFAULT_CLEF_INDEX
}

const bpm = useLocalStorage('syng.notesBpm', DEFAULT_BPM)
if (!ALLOWED_BPMS.includes(bpm.value)) {
  bpm.value = DEFAULT_BPM
}

const activeTab = useLocalStorage('syng.notesTab', 'listen')

/* Active-bar highlight — the green box over the current note's measure. Shared by
 * both tabs. Default on; purely visual. */
const isBarHighlightEnabled = useLocalStorage('syng.notesBarHighlight', true)

/* Note-name labels above every note. Shared by both tabs. Default on — the page's
 * whole point is to show the notes and their tone labels. */
const areToneLabelsShown = useLocalStorage('syng.notesToneLabels', true)

const listenGame = useNotesPlayback()
/* Silent timeline for the "Sing live" tab — advances the sheet on the BPM clock
 * with no playback; the singer's mic supplies the sound. */
const singGame = useNotesPlayback({ silent: true })
/* Audible instance for the "Sing live" tab's ♪/Mute preview. */
const singPreviewGame = useNotesPlayback()

/* One shared audio engine drives every tab — stop any in-flight playback when
 * switching so the inactive tab can't keep scheduling notes underneath. */
watch(activeTab, () => {
  listenGame.stop()
  singGame.stop()
  singPreviewGame.stop()
})
</script>

<template>
  <div class="mx-auto w-full max-w-400">
    <PrimeTabs v-model:value="activeTab">
      <PrimeTabList>
        <PrimeTab value="listen">{{ t('notes.tabs.listen') }}</PrimeTab>
        <PrimeTab value="sing-live">{{ t('notes.tabs.singLive') }}</PrimeTab>
      </PrimeTabList>
      <PrimeTabPanels class="px-0">
        <PrimeTabPanel value="listen">
          <NotesListenDisplay
            :game="listenGame"
            :isActive="activeTab === 'listen'"
            v-model:clefIndex="clefIndex"
            v-model:bpm="bpm"
            v-model:isBarHighlightEnabled="isBarHighlightEnabled"
            v-model:areToneLabelsShown="areToneLabelsShown"
          />
        </PrimeTabPanel>
        <PrimeTabPanel value="sing-live">
          <NotesSingDisplay
            :game="singGame"
            :previewGame="singPreviewGame"
            v-model:clefIndex="clefIndex"
            v-model:bpm="bpm"
            v-model:isBarHighlightEnabled="isBarHighlightEnabled"
            v-model:areToneLabelsShown="areToneLabelsShown"
          />
        </PrimeTabPanel>
      </PrimeTabPanels>
    </PrimeTabs>
  </div>
</template>

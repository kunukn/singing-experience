<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import NotesOverviewDisplay from './NotesOverviewDisplay.vue'
import NotesListenDisplay from './NotesListenDisplay.vue'
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

/* Default to the Listen tab; coerce any stale persisted value (e.g. the removed
 * 'sing-live') back to a known tab so a panel always shows. */
const activeTab = useLocalStorage('syng.notesTab', 'listen')
if (activeTab.value !== 'listen' && activeTab.value !== 'overview') {
  activeTab.value = 'listen'
}

/* Active-bar highlight — the green box over the current note's measure. Used by
 * the Listen tab. Default on; purely visual. */
const isBarHighlightEnabled = useLocalStorage('syng.notesBarHighlight', true)

/* Note-name labels above every note. Shared by both tabs. Default on — the page's
 * whole point is to show the notes and their tone labels. */
const areToneLabelsShown = useLocalStorage('syng.notesToneLabels', true)

const listenGame = useNotesPlayback()

/* Stop any in-flight Listen playback when switching to the (silent) Overview tab
 * so it can't keep scheduling notes underneath. */
watch(activeTab, () => {
  listenGame.stop()
})
</script>

<template>
  <div class="mx-auto w-full max-w-400">
    <PrimeTabs v-model:value="activeTab">
      <PrimeTabList>
        <PrimeTab value="listen">{{ t('notes.tabs.listen') }}</PrimeTab>
        <PrimeTab value="overview">{{ t('notes.tabs.overview') }}</PrimeTab>
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
        <PrimeTabPanel value="overview">
          <NotesOverviewDisplay
            v-model:areToneLabelsShown="areToneLabelsShown"
          />
        </PrimeTabPanel>
      </PrimeTabPanels>
    </PrimeTabs>
  </div>
</template>

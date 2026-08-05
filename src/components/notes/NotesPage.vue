<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import NotesOverviewDisplay from './NotesOverviewDisplay.vue'
import NotesListenDisplay from './NotesListenDisplay.vue'
import { ALLOWED_BPMS, DEFAULT_BPM } from './notesConstants'
import { NOTE_SCALES } from './notesScales'
import { useNotesPlayback } from './useNotesPlayback'

const { t } = useI18n()

const route = useRoute()
const router = useRouter()

const TAB_VALUES = ['listen', 'overview'] as const
type NotesTab = (typeof TAB_VALUES)[number]
const DEFAULT_TAB: NotesTab = 'listen'

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
if (!(ALLOWED_BPMS as readonly number[]).includes(bpm.value)) {
  bpm.value = DEFAULT_BPM
}

/* Active tab lives only in the URL (?tab=listen|overview) — the single source
 * of truth. Unknown/missing values fall back to the default so a panel always
 * shows. replace() keeps tab switches out of the browser history. */
const activeTab = computed<NotesTab>({
  get() {
    const tab = route.query.tab
    return TAB_VALUES.includes(tab as NotesTab)
      ? (tab as NotesTab)
      : DEFAULT_TAB
  },
  set(tab) {
    router.replace({ query: { ...route.query, tab } })
  },
})

/* Note-name labels above every note. Shared by both tabs. Default 'simple' — the
 * page's whole point is to show the notes and their names; the plain name is
 * enough for most practice, 'advanced' adds the octave digit (C4 vs C), 'off'
 * hides labels entirely. */
const toneLabelMode = useToneLabelMode('syng.notesToneLabelMode', 'simple')

/* Whether the sheets include accidental (black-key) notes. Default off — the
 * basic view is the natural notes only; on reveals the full chromatic scale. */
const includeAccidentals = useLocalStorage(
  'syng.notesIncludeAccidentals',
  false,
)

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
            v-model:toneLabelMode="toneLabelMode"
            v-model:includeAccidentals="includeAccidentals"
          />
        </PrimeTabPanel>
        <PrimeTabPanel value="overview">
          <NotesOverviewDisplay
            :isActive="activeTab === 'overview'"
            v-model:toneLabelMode="toneLabelMode"
            v-model:includeAccidentals="includeAccidentals"
          />
        </PrimeTabPanel>
      </PrimeTabPanels>
    </PrimeTabs>
  </div>
</template>

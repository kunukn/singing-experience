<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import {
  DEFAULT_GUITAR_TUNING_ID,
  GUITAR_TUNINGS,
  type GuitarTuningId,
} from '@/utils/guitarTunings'
import {
  DEFAULT_SCALE_HIGHLIGHT_MODE,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'
import { useResizeObserver } from '@vueuse/core'
import { guitarMidiMax, guitarMidiMin } from './guitarLayout'

/* Developer harness for GuitarPage: same settings row, scale select and
 * fretboard, but the preview lanes are fed by simulated singers instead of the
 * microphone — so the duet band split and the string-by-string preview segments
 * can be driven without a mic or two real people. */

/* Board settings are plain refs here, not useLocalStorage: the harness must not
 * write the syng.guitar* keys the real page persists. */
const tuningId = ref<GuitarTuningId>(DEFAULT_GUITAR_TUNING_ID)
const toneLabelMode = ref<ToneLabelMode>('off')
const accidentalStyle = ref<AccidentalStyle>('sharp')
const scaleRoot = ref<number | null>(null)
const scaleMode = ref<ScaleHighlightMode>(DEFAULT_SCALE_HIGHLIGHT_MODE)
const isDuetEnabled = ref(false)

const tuningMidi = computed(() => GUITAR_TUNINGS[tuningId.value].midi)
const midiMin = computed(() => guitarMidiMin(tuningMidi.value))
const midiMax = computed(() => guitarMidiMax(tuningMidi.value))

/* The shared "See your voice" setting, kept as-is so the toggle behaves exactly
 * as it does on the live page. */
const { isPreviewEnabled } = useSettings()

/* Open low string and first string of standard tuning — either side of the duet
 * crossover, so both lanes render as soon as the duet toggle goes on. */
const { visibleSingers, previewLanes, armDeafPeriod } = useSimulatedSingers({
  isPreviewEnabled,
  isDuetEnabled,
  low: { label: 'Singer A (low)', note: 'A', octave: 2 },
  high: { label: 'Singer B (high)', note: 'E', octave: 4 },
})

/*
 * The singer panel is chrome the real page does not have, so the board would
 * otherwise be sized ~130px too tall here and run off the bottom of the screen —
 * worse with two singers, which adds a second panel.
 *
 * Measured here rather than inside GuitarDisplay: this panel's height depends on
 * the singer count and nothing else, so no amount of board resizing can feed
 * back into it. The gap below accounts for the flex gap above the board plus the
 * page's own bottom padding.
 */
const SINGER_PANEL_GAP = 20 // px — flex gap above the board, plus pb-4

const singerPanel = useTemplateRef<HTMLElement>('singerPanel')
const singerPanelHeight = ref(0)
useResizeObserver(singerPanel, ([entry]) => {
  singerPanelHeight.value = entry.contentRect.height
})

const extraVerticalChrome = computed(() =>
  singerPanelHeight.value ? singerPanelHeight.value + SINGER_PANEL_GAP : 0,
)
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="guitar-test-page"
  >
    <GuitarSettingsRow
      v-model:tuningId="tuningId"
      v-model:toneLabelMode="toneLabelMode"
      v-model:accidentalStyle="accidentalStyle"
      v-model:isPreviewEnabled="isPreviewEnabled"
      v-model:isDuetEnabled="isDuetEnabled"
      :micPermission="null"
    />

    <GuitarScaleSelect
      v-model:scaleRoot="scaleRoot"
      v-model:scaleMode="scaleMode"
    />

    <!-- Narrower than the fretboard below: the harness controls read better
         grouped than stretched across a 1600px row. -->
    <div ref="singerPanel" class="flex w-full max-w-3xl flex-col gap-2">
      <SimulatedSingerControls
        v-for="singer in visibleSingers"
        :key="singer.laneId"
        :singer="singer"
      />
    </div>

    <!-- Only the fretboard widens, matching GuitarPage. -->
    <div class="mx-auto w-full max-w-400">
      <GuitarDisplay
        :midiMin="midiMin"
        :midiMax="midiMax"
        :tuningMidi="tuningMidi"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :toneLabelMode="toneLabelMode"
        :accidentalStyle="accidentalStyle"
        :scaleRoot="scaleRoot"
        :scaleMode="scaleMode"
        :extraVerticalChrome="extraVerticalChrome"
        @tonePlayed="armDeafPeriod"
      />
    </div>
  </div>
</template>

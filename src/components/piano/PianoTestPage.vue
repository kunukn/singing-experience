<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import {
  DEFAULT_SCALE_HIGHLIGHT_MODE,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'

/* Developer harness for PianoPage: same settings row, scale select and keyboard,
 * but the preview lanes are fed by simulated singers instead of the microphone —
 * so the duet band split, the lane colours and the chip collision handling can
 * be driven without a mic or two real people. */

/* Board settings are plain refs here, not useLocalStorage: the harness must not
 * write the syng.piano* keys the real page persists. */
const rangeIndex = ref(DEFAULT_RANGE_INDEX)
const toneLabelMode = ref<ToneLabelMode>('off')
const accidentalStyle = ref<AccidentalStyle>('sharp')
const areKeyboardHintsVisible = ref(true)
const scaleRoot = ref<number | null>(null)
const scaleMode = ref<ScaleHighlightMode>(DEFAULT_SCALE_HIGHLIGHT_MODE)
const isDuetEnabled = ref(false)

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

/* The shared "See your voice" setting, kept as-is so the toggle behaves exactly
 * as it does on the live page. */
const { isPreviewEnabled } = useSettings()

/* The two starting notes straddle the duet crossover, so both lanes render as
 * soon as the duet toggle goes on. */
const { visibleSingers, previewLanes, armDeafPeriod } = useSimulatedSingers({
  isPreviewEnabled,
  isDuetEnabled,
  low: { label: 'Singer A (low)', note: 'G', octave: 3 },
  high: { label: 'Singer B (high)', note: 'D', octave: 5 },
})
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="piano-test-page"
  >
    <PianoSettingsRow
      v-model:rangeIndex="rangeIndex"
      v-model:toneLabelMode="toneLabelMode"
      v-model:accidentalStyle="accidentalStyle"
      v-model:isPreviewEnabled="isPreviewEnabled"
      v-model:isDuetEnabled="isDuetEnabled"
      v-model:areKeyboardHintsVisible="areKeyboardHintsVisible"
      :micPermission="null"
    />

    <PianoScaleSelect
      v-model:scaleRoot="scaleRoot"
      v-model:scaleMode="scaleMode"
    />

    <!-- Narrower than the keyboard below: the harness controls read better
         grouped than stretched across a 1600px row. -->
    <div class="flex w-full max-w-3xl flex-col gap-2">
      <SimulatedSingerControls
        v-for="singer in visibleSingers"
        :key="singer.laneId"
        :singer="singer"
      />
    </div>

    <!-- Only the keyboard widens, matching PianoPage. -->
    <div class="mx-auto w-full max-w-400">
      <PianoDisplay
        :rangeIndex="rangeIndex"
        :midiMin="selectedRange.midiMin"
        :midiMax="selectedRange.midiMax"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :toneLabelMode="toneLabelMode"
        :accidentalStyle="accidentalStyle"
        :areKeyboardHintsVisible="areKeyboardHintsVisible"
        :scaleRoot="scaleRoot"
        :scaleMode="scaleMode"
        @tonePlayed="armDeafPeriod"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import { DEFAULT_RANGE_INDEX, VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_OPTIONS_HIGH_TO_LOW, toAccidentalGlyph } from '@/utils/noteUtils'
import {
  DEFAULT_SCALE_HIGHLIGHT_MODE,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'
import type { PianoPreviewLaneId } from './pianoPreview'

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

function createSinger(label: string, note: NoteName, octave: number) {
  const state = reactive({
    note,
    octave,
    cents: 0,
    clarity: 0.95,
    jitter: 2,
  })

  return {
    label,
    state,
    detection: useSimulatedPitchDetection(toRefs(state)),
  }
}

type Singer = ReturnType<typeof createSinger>

/* The two starting notes straddle the duet crossover, so both lanes render as
 * soon as the duet toggle goes on. */
const singerLow = createSinger('Singer A (low)', 'G', 3)
const singerHigh = createSinger('Singer B (high)', 'D', 5)
const singers = [singerLow, singerHigh]

const visibleSingers = computed(() =>
  isDuetEnabled.value ? singers : [singerLow],
)

/* A live rAF signal (never the mic), so frequencyToNote's hysteresis behaves as
 * it would with a real singer. */
onMounted(() => singers.forEach((singer) => singer.detection.start()))
onUnmounted(() => singers.forEach((singer) => singer.detection.stop()))

/* Mirrors the mic-deaf window PianoPage arms on every key press so a played tone
 * is never mistaken for singing. Matches DEAF_PERIOD_MS in
 * useDuetPitchDetection. */
const DEAF_PERIOD_MS = 1000
const isDeaf = ref(false)
let deafTimeoutId: ReturnType<typeof setTimeout> | null = null

function handleTonePlayed() {
  isDeaf.value = true

  if (deafTimeoutId !== null) clearTimeout(deafTimeoutId)

  deafTimeoutId = setTimeout(() => {
    isDeaf.value = false
    deafTimeoutId = null
  }, DEAF_PERIOD_MS)
}

onUnmounted(() => {
  if (deafTimeoutId !== null) clearTimeout(deafTimeoutId)
})

const EMPTY_LANE: DuetLane = {
  previewMidi: null,
  previewFrequency: null,
  previewNoteLabel: null,
}

/* Same lane semantics as useDuetPitchDetection.toLane: nothing while the preview
 * is off or the deaf period is armed, and nothing for an unclean reading — which
 * is what makes the Clarity slider meaningful. */
function toLane(singer: Singer): DuetLane {
  if (!isPreviewEnabled.value || isDeaf.value) return EMPTY_LANE

  const noteInfo = singer.detection.noteInfo.value
  if (!noteInfo || !singer.detection.isClean.value) return EMPTY_LANE

  return {
    previewMidi: noteInfo.midiNote,
    previewFrequency: singer.detection.frequency.value,
    previewNoteLabel: toAccidentalGlyph(`${noteInfo.note}${noteInfo.octave}`),
  }
}

/* Single-voice mode renders through the same lane pipeline as duet mode, just
 * with one entry — matching PianoPage. */
const previewLanes = computed<Array<DuetLane & { laneId: PianoPreviewLaneId }>>(
  () =>
    isDuetEnabled.value
      ? [
          { ...toLane(singerLow), laneId: 'low' },
          { ...toLane(singerHigh), laneId: 'high' },
        ]
      : [{ ...toLane(singerLow), laneId: 'low' }],
)
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4"
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
      <div
        v-for="singer in visibleSingers"
        :key="singer.label"
        class="flex w-full flex-col gap-2 rounded-lg bg-(--p-content-background) p-4"
      >
        <span class="text-sm font-medium">{{ singer.label }}</span>

        <div class="flex w-full flex-wrap items-end gap-4">
          <div class="flex flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">Note</label>
            <PrimeSelect
              v-model="singer.state.note"
              :options="[...NOTE_OPTIONS_HIGH_TO_LOW]"
              optionLabel="label"
              optionValue="value"
              class="min-w-20"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">Octave</label>
            <PrimeSelect
              v-model="singer.state.octave"
              :options="[1, 2, 3, 4, 5, 6].toReversed()"
              class="min-w-16"
            />
          </div>

          <div class="flex min-w-40 flex-1 flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">
              Cents: {{ singer.state.cents > 0 ? '+' : ''
              }}{{ singer.state.cents }}
            </label>
            <input
              v-model.number="singer.state.cents"
              type="range"
              min="-50"
              max="50"
              step="1"
              class="w-full"
            />
          </div>

          <div class="flex min-w-32 flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">
              Clarity: {{ Math.round(singer.state.clarity * 100) }}%
            </label>
            <input
              v-model.number="singer.state.clarity"
              type="range"
              min="0"
              max="1"
              step="0.01"
              class="w-full"
            />
          </div>

          <div class="flex min-w-28 flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">
              Jitter: ±{{ singer.state.jitter }}¢
            </label>
            <input
              v-model.number="singer.state.jitter"
              type="range"
              min="0"
              max="20"
              step="1"
              class="w-full"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Only the keyboard widens, matching PianoPage. -->
    <div class="mx-auto w-full max-w-400">
      <PianoDisplay
        :midiMin="selectedRange.midiMin"
        :midiMax="selectedRange.midiMax"
        :previewLanes="previewLanes"
        :isPreviewEnabled="isPreviewEnabled"
        :toneLabelMode="toneLabelMode"
        :accidentalStyle="accidentalStyle"
        :areKeyboardHintsVisible="areKeyboardHintsVisible"
        :scaleRoot="scaleRoot"
        :scaleMode="scaleMode"
        @tonePlayed="handleTonePlayed"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { DEFAULT_RANGE_INDEX } from '@/constants/voiceRanges'
import type { NoteName } from '@/utils/noteUtils'
import {
  midiToFrequency,
  NOTE_NAMES,
  NOTE_OPTIONS_HIGH_TO_LOW,
} from '@/utils/noteUtils'
import WarmUpDisplay from './WarmUpDisplay.vue'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_PATTERN,
  DEFAULT_SEMITONE_STEP,
  DEFAULT_SEQUENCE_COUNT,
  useWarmUpGame,
  type WarmUpPatternId,
} from './useWarmUpGame'

const selectedDurationSec = ref(DEFAULT_HOLD_DURATION_MS / 1000)
const selectedRangeIndex = ref<number>(DEFAULT_RANGE_INDEX)
const selectedSequenceCount = ref<number>(DEFAULT_SEQUENCE_COUNT)
const selectedSemitoneStep = ref<number>(DEFAULT_SEMITONE_STEP)
const selectedPatternId = ref<WarmUpPatternId>(DEFAULT_PATTERN)

const selectedNote = ref<NoteName>('C')
const selectedOctave = ref(4)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

const game = useWarmUpGame({ pitchDetection: detection })

const { isPreviewEnabled } = useSettings()

/* Idle = not listening and not complete */
const isIdle = computed(() => !game.isListening.value && !game.isComplete.value)

const overridePreviewMidi = computed(() => {
  if (!isIdle.value || !isPreviewEnabled.value) return null

  return (
    (selectedOctave.value + 1) * 12 + NOTE_NAMES.indexOf(selectedNote.value)
  )
})

const overridePreviewNoteLabel = computed(() => {
  if (!isIdle.value || !isPreviewEnabled.value) return null

  return `${selectedNote.value}${selectedOctave.value}`
})

/* Frequency derived from the integer MIDI plus simulated cents offset, so the
 * chart can position the singer line at sub-semitone precision. */
const overridePreviewFrequency = computed(() => {
  if (overridePreviewMidi.value === null) return null

  // 100 cents = one semitone
  return midiToFrequency(overridePreviewMidi.value + selectedCents.value / 100)
})

function snapToTarget() {
  const midi = game.targetMidi.value
  if (midi == null) return

  selectedOctave.value = Math.floor(midi / 12) - 1
  selectedNote.value = NOTE_NAMES[midi % 12]
  selectedCents.value = 0
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
    >
      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Note</label>
        <PrimeSelect
          v-model="selectedNote"
          :options="[...NOTE_OPTIONS_HIGH_TO_LOW]"
          optionLabel="label"
          optionValue="value"
          class="min-w-20"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Octave</label>
        <PrimeSelect
          v-model="selectedOctave"
          :options="[2, 3, 4, 5, 6].reverse()"
          class="min-w-16"
        />
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Cents: {{ selectedCents > 0 ? '+' : '' }}{{ selectedCents }}
        </label>
        <input
          v-model.number="selectedCents"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full"
        />
      </div>

      <div class="flex min-w-32 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Clarity: {{ Math.round(selectedClarity * 100) }}%
        </label>
        <input
          v-model.number="selectedClarity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full"
        />
      </div>

      <div class="flex min-w-28 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Jitter: ±{{ selectedJitter }}¢
        </label>
        <input
          v-model.number="selectedJitter"
          type="range"
          min="0"
          max="20"
          step="1"
          class="w-full"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Helper</label>
        <PrimeButton
          label="Snap to target"
          severity="secondary"
          size="small"
          :disabled="game.targetMidi.value == null"
          @click="snapToTarget"
        />
      </div>
    </div>

    <WarmUpDisplay
      :game="game"
      :overridePreviewMidi="overridePreviewMidi"
      :overridePreviewNoteLabel="overridePreviewNoteLabel"
      :overridePreviewFrequency="overridePreviewFrequency"
      :disableIdlePreview="true"
      v-model:durationSec="selectedDurationSec"
      v-model:rangeIndex="selectedRangeIndex"
      v-model:sequenceCount="selectedSequenceCount"
      v-model:semitoneStep="selectedSemitoneStep"
      v-model:patternId="selectedPatternId"
    />
  </div>
</template>

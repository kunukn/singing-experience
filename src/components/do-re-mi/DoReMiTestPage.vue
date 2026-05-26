<script setup lang="ts">
import type { NoteName, ScaleMode } from '@/utils/noteUtils'
import {
  midiToFrequency,
  NOTE_NAMES,
  NOTE_NAMES_HIGH_TO_LOW,
} from '@/utils/noteUtils'
import DoReMiDisplay from './DoReMiDisplay.vue'
import type { ScaleStep } from './useDoReMiGame'
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_SCALE_MODE,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  useDoReMiGame,
} from './useDoReMiGame'

const selectedDurationSec = ref(DEFAULT_HOLD_DURATION_MS / 1000)
const selectedStartOffset = ref(DEFAULT_STARTING_SEMITONE_OFFSET)
const selectedScaleMode = ref<ScaleMode>(DEFAULT_SCALE_MODE)

const selectedNote = ref<NoteName>('G')
const selectedOctave = ref(3)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

const simulatedPitch = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

const game = useDoReMiGame({ pitchDetection: simulatedPitch })

const { isPreviewEnabled } = useSettings()

/* Idle = not listening and not complete */
const isIdle = computed(() => !game.isListening.value && !game.isComplete.value)

/* Compute preview values directly from selected note/octave — no need to start simulatedPitch */
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
 * canvas can display the cents deviation next to the note label. */
const overridePreviewFrequency = computed(() => {
  if (overridePreviewMidi.value === null) return null

  // 100 cents = one semitone
  return midiToFrequency(overridePreviewMidi.value + selectedCents.value / 100)
})

function matchTarget(targetStep: ScaleStep | undefined) {
  if (!targetStep) return

  selectedNote.value = targetStep.note
  selectedOctave.value = targetStep.octave
  selectedCents.value = 0
}
</script>

<template>
  <DoReMiDisplay
    :game="game"
    :titleSuffix="'(Test)'"
    :overridePreviewMidi="overridePreviewMidi"
    :overridePreviewNoteLabel="overridePreviewNoteLabel"
    :overridePreviewFrequency="overridePreviewFrequency"
    :disableIdlePreview="true"
    v-model:durationSec="selectedDurationSec"
    v-model:startOffset="selectedStartOffset"
    v-model:scaleMode="selectedScaleMode"
  >
    <template #default="{ gameState, targetStep }">
      <div
        class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">Note</label>
          <PrimeSelect
            v-model="selectedNote"
            :options="[...NOTE_NAMES_HIGH_TO_LOW]"
            class="min-w-20"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">Octave</label>
          <PrimeSelect
            v-model="selectedOctave"
            :options="[2, 3, 4, 5, 6].toReversed()"
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

        <PrimeButton
          v-if="gameState === 'playing'"
          severity="secondary"
          rounded
          class="text-sm"
          @click="matchTarget(targetStep)"
        >
          Match target
        </PrimeButton>
      </div>
    </template>
  </DoReMiDisplay>
</template>

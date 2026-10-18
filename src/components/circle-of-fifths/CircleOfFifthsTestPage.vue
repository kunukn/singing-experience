<script setup lang="ts">
import type { Difficulty } from '@/constants/difficulty'
import { DEFAULT_RANGE_INDEX } from '@/constants/voiceRanges'
import type { NoteName } from '@/utils/noteUtils'
import {
  midiToNoteLabel,
  NOTE_NAMES,
  NOTE_OPTIONS_HIGH_TO_LOW,
} from '@/utils/noteUtils'
import type {
  CircleDirection,
  CircleMode,
  CircleView,
  OctaveShift,
} from './circleOfFifths'
import CircleOfFifthsDisplay from './CircleOfFifthsDisplay.vue'
import type { SingTarget } from './useCircleOfFifthsGame'
import {
  DEFAULT_DIFFICULTY,
  DEFAULT_DIRECTION,
  DEFAULT_HOLD_DURATION_MS,
  useCircleOfFifthsGame,
} from './useCircleOfFifthsGame'

/* Plain refs, not localStorage — the test page never touches saved settings */
const selectedMode = ref<CircleMode>('walk')
const selectedDirection = ref<CircleDirection>(DEFAULT_DIRECTION)
const selectedView = ref<CircleView>('fifths')
const selectedDifficulty = ref<Difficulty>(DEFAULT_DIFFICULTY)
const selectedHoldDurationSec = ref(DEFAULT_HOLD_DURATION_MS / 1000)
const selectedRangeIndex = ref(DEFAULT_RANGE_INDEX)
const selectedOctaveShift = ref<OctaveShift>(0)

const selectedNote = ref<NoteName>('C')
const selectedOctave = ref(4)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

/* Simulated voice only — test pages never open the microphone */
const simulatedPitch = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

const game = useCircleOfFifthsGame({ pitchDetection: simulatedPitch })

const octaveOptions = [2, 3, 4, 5, 6].toReversed()

const { isPreviewEnabled } = useSettings()

/* Stands in for the mic preview on the idle screens: the selected note is
 * what the singer is "singing" */
const overridePreviewMidi = computed(() => {
  if (!game.isIdle.value || !isPreviewEnabled.value) return null

  /* MIDI = (octave + 1) × 12 + semitone, so C4 = 60 */
  return (
    (selectedOctave.value + 1) * 12 + NOTE_NAMES.indexOf(selectedNote.value)
  )
})

function matchTarget(target: SingTarget | null) {
  if (!target) return

  const { note, octave } = midiToNoteLabel(target.midi)
  selectedNote.value = note as NoteName
  selectedOctave.value = octave
  selectedCents.value = 0
}
</script>

<template>
  <CircleOfFifthsDisplay
    :game="game"
    :titleSuffix="'(Test)'"
    :disableIdlePreview="true"
    :overridePreviewMidi="overridePreviewMidi"
    :overridePreviewCents="selectedCents"
    v-model:mode="selectedMode"
    v-model:direction="selectedDirection"
    v-model:view="selectedView"
    v-model:difficulty="selectedDifficulty"
    v-model:holdDurationSec="selectedHoldDurationSec"
    v-model:rangeIndex="selectedRangeIndex"
    v-model:octaveShift="selectedOctaveShift"
  >
    <template #default="{ phase, currentTarget }">
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
            :options="octaveOptions"
            class="min-w-16"
          />
        </div>

        <div class="flex min-w-40 flex-1 flex-col gap-2">
          <label class="text-xs text-(--p-text-muted-color)">
            Cents: {{ selectedCents > 0 ? '+' : '' }}{{ selectedCents }}
          </label>
          <PrimeSlider v-model="selectedCents" :min="-50" :max="50" />
        </div>

        <div class="flex min-w-32 flex-col gap-2">
          <label class="text-xs text-(--p-text-muted-color)">
            Clarity: {{ Math.round(selectedClarity * 100) }}%
          </label>
          <PrimeSlider
            v-model="selectedClarity"
            :min="0"
            :max="1"
            :step="0.01"
          />
        </div>

        <div class="flex min-w-28 flex-col gap-2">
          <label class="text-xs text-(--p-text-muted-color)">
            Jitter: ±{{ selectedJitter }}¢
          </label>
          <PrimeSlider v-model="selectedJitter" :min="0" :max="20" />
        </div>

        <PrimeButton
          v-if="phase === 'walking' || phase === 'patternSinging'"
          severity="secondary"
          rounded
          class="text-sm"
          data-testid="match-target"
          @click="matchTarget(currentTarget)"
        >
          Match target
        </PrimeButton>
      </div>
    </template>
  </CircleOfFifthsDisplay>
</template>

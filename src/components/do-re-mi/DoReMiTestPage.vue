<script setup lang="ts">
import {
  DEFAULT_HOLD_DURATION_MS,
  DEFAULT_STARTING_SEMITONE_OFFSET,
  DEFAULT_SCALE_MODE,
} from '@/composables/useDoReMiGame'
import type { ScaleStep } from '@/composables/useDoReMiGame'
import type { ToneMode } from '@/composables/toneEngine'
import type { NoteName, ScaleMode } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import DoReMiDisplay from './DoReMiDisplay.vue'

const selectedDurationSec = ref(DEFAULT_HOLD_DURATION_MS / 1000)
const selectedStartOffset = ref(DEFAULT_STARTING_SEMITONE_OFFSET)
const selectedScaleMode = ref<ScaleMode>(DEFAULT_SCALE_MODE)

const { toneMode } = useTonePlayer()
const selectedToneMode = ref<ToneMode>(toneMode.value)

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
    v-model:durationSec="selectedDurationSec"
    v-model:startOffset="selectedStartOffset"
    v-model:scaleMode="selectedScaleMode"
    v-model:toneMode="selectedToneMode"
  >
    <template #default="{ gameState, targetStep }">
      <div
        class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-gray-800/50 p-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Note</label>
          <Select v-model="selectedNote" class="min-w-20">
            <option v-for="note in NOTE_NAMES" :key="note" :value="note">
              {{ note }}
            </option>
          </Select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Octave</label>
          <Select v-model.number="selectedOctave" class="min-w-16">
            <option v-for="oct in [2, 3, 4, 5, 6]" :key="oct" :value="oct">
              {{ oct }}
            </option>
          </Select>
        </div>

        <div class="flex min-w-40 flex-1 flex-col gap-1">
          <label class="text-xs text-gray-400">
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
          <label class="text-xs text-gray-400">
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
          <label class="text-xs text-gray-400">
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

        <Button
          v-if="gameState === 'playing'"
          variant="purple"
          class="text-sm"
          @click="matchTarget(targetStep)"
        >
          Match target
        </Button>
      </div>
    </template>
  </DoReMiDisplay>
</template>

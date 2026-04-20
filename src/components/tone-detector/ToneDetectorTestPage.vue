<script setup lang="ts">
import type { SimulatedToneConfig } from './useSimulatedMultiToneDetection'
import { useSimulatedMultiToneDetection } from './useSimulatedMultiToneDetection'
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import ToneDetectorDisplay from './ToneDetectorDisplay.vue'

const MAX_SIMULATED_TONES = 4

function createToneSlot(
  note: NoteName = 'C',
  octave: number = 4,
  enabled: boolean = true,
): SimulatedToneConfig {
  return { note, octave, cents: 0, jitter: 2, enabled }
}

const toneSlots = ref<SimulatedToneConfig[]>([
  createToneSlot('C', 4),
  createToneSlot('E', 4, false),
  createToneSlot('G', 4, false),
])

const detection = useSimulatedMultiToneDetection(toneSlots)

function addToneSlot() {
  if (toneSlots.value.length >= MAX_SIMULATED_TONES) return

  toneSlots.value.push(createToneSlot('G', 4, true))
}

function removeToneSlot(index: number) {
  if (toneSlots.value.length <= 1) return

  toneSlots.value.splice(index, 1)
}
</script>

<template>
  <ToneDetectorDisplay :detection="detection">
    <div class="flex w-full flex-col gap-4">
      <div
        v-for="(slot, index) in toneSlots"
        :key="index"
        class="flex flex-wrap items-end gap-4 rounded-lg bg-gray-800/50 p-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Tone {{ index + 1 }}</label>
          <div class="flex items-center gap-2">
            <input
              :id="`tone-enabled-${index}`"
              v-model="slot.enabled"
              type="checkbox"
              class="accent-blue-500"
            />
            <label :for="`tone-enabled-${index}`" class="text-xs text-gray-400">
              On
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Note</label>
          <Select v-model="slot.note" class="min-w-20">
            <option v-for="note in NOTE_NAMES" :key="note" :value="note">
              {{ note }}
            </option>
          </Select>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-gray-400">Octave</label>
          <Select v-model.number="slot.octave" class="min-w-16">
            <option v-for="oct in [2, 3, 4, 5, 6]" :key="oct" :value="oct">
              {{ oct }}
            </option>
          </Select>
        </div>

        <div class="flex min-w-40 flex-1 flex-col gap-1">
          <label class="text-xs text-gray-400">
            Cents: {{ slot.cents > 0 ? '+' : '' }}{{ slot.cents }}
          </label>
          <input
            v-model.number="slot.cents"
            type="range"
            min="-50"
            max="50"
            step="1"
            class="w-full"
          />
        </div>

        <div class="flex min-w-28 flex-col gap-1">
          <label class="text-xs text-gray-400">
            Jitter: ±{{ slot.jitter }}¢
          </label>
          <input
            v-model.number="slot.jitter"
            type="range"
            min="0"
            max="20"
            step="1"
            class="w-full"
          />
        </div>

        <Button
          v-if="toneSlots.length > 1"
          variant="red"
          class="text-xs"
          @click="removeToneSlot(index)"
        >
          ✕
        </Button>
      </div>

      <Button
        v-if="toneSlots.length < MAX_SIMULATED_TONES"
        variant="yellow"
        class="self-start text-sm"
        @click="addToneSlot"
      >
        + Add tone
      </Button>
    </div>
  </ToneDetectorDisplay>
</template>

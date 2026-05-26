<script setup lang="ts">
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import ToneDetectorDisplay from './ToneDetectorDisplay.vue'
import type { SimulatedToneConfig } from './useSimulatedMultiToneDetection'
import { useSimulatedMultiToneDetection } from './useSimulatedMultiToneDetection'

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
        class="flex flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
      >
        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)"
            >Tone {{ index + 1 }}</label
          >
          <div class="flex items-center gap-2">
            <PrimeToggleSwitch
              v-model="slot.enabled"
              :inputId="`tone-enabled-${index}`"
            />
            <label
              :for="`tone-enabled-${index}`"
              class="text-xs text-(--p-text-muted-color)"
            >
              On
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">Note</label>
          <PrimeSelect
            v-model="slot.note"
            :options="[...NOTE_NAMES]"
            class="min-w-20"
            size="small"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">Octave</label>
          <PrimeSelect
            v-model="slot.octave"
            :options="[2, 3, 4, 5, 6]"
            class="min-w-16"
            size="small"
          />
        </div>

        <div class="flex min-w-40 flex-1 flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">
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
          <label class="text-xs text-(--p-text-muted-color)">
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

        <PrimeButton
          v-if="toneSlots.length > 1"
          severity="danger"
          rounded
          class="aspect-square text-xs"
          @click="removeToneSlot(index)"
        >
          ✕
        </PrimeButton>
      </div>

      <div class="px-4 pb-2">
        <PrimeButton
          v-if="toneSlots.length < MAX_SIMULATED_TONES"
          severity="warn"
          rounded
          class="self-start text-sm"
          size="small"
          @click="addToneSlot"
        >
          + Add tone
        </PrimeButton>
      </div>
    </div>
  </ToneDetectorDisplay>
</template>

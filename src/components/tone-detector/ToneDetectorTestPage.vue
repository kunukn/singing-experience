<script setup lang="ts">
import type { SimulatedToneConfig } from '@/composables/useSimulatedMultiToneDetection'
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import { textColorAtMidi } from '@/utils/pitchColors'

const { t } = useI18n()

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

const { detectedTones, isListening, error, start, stop } =
  useSimulatedMultiToneDetection(toneSlots)

function addToneSlot() {
  if (toneSlots.value.length >= MAX_SIMULATED_TONES) return

  toneSlots.value.push(createToneSlot('G', 4, true))
}

function removeToneSlot(index: number) {
  if (toneSlots.value.length <= 1) return

  toneSlots.value.splice(index, 1)
}

function toggle() {
  if (isListening.value) stop()
  else start()
}

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <div class="flex w-full items-center gap-4">
      <Button
        class="ms-auto min-w-27.5"
        :variant="isListening ? 'red' : 'green'"
        @click="toggle"
      >
        {{ isListening ? t('generic.stop') : t('generic.start') }}
      </Button>
    </div>

    <p v-if="error" class="text-sm text-red-400">{{ error }}</p>

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

    <div v-if="isListening" class="flex w-full flex-col items-center gap-4">
      <p v-if="detectedTones.length === 0" class="text-sm text-gray-500">
        {{ t('toneDetector.listening') }}
      </p>

      <div
        v-else
        class="flex flex-wrap items-baseline justify-center gap-4 sm:gap-6"
      >
        <div
          v-for="tone in detectedTones"
          :key="tone.midiNote"
          class="flex flex-col items-center transition-colors duration-150"
          :style="{
            color: tone.isClean ? textColorAtMidi(tone.midiNote) : undefined,
          }"
          :class="{ 'text-gray-500 opacity-30': !tone.isClean }"
        >
          <div v-if="tone.isClean">
            <span class="text-5xl font-bold tracking-tight sm:text-7xl">
              {{ tone.note }}
            </span>
            <span
              class="mt-1 inline-block align-top text-2xl font-light sm:text-4xl"
            >
              {{ tone.octave }}
            </span>
          </div>
          <span class="mt-1 text-xs text-gray-400 tabular-nums">
            {{ Math.round(tone.frequency) }}
            {{ t('toneDetector.hz') }}
          </span>
        </div>
      </div>

      <p class="text-xs text-gray-600">
        {{ t('toneDetector.tonesDetected', { count: detectedTones.length }) }}
      </p>
    </div>

    <div v-else class="flex flex-col items-center gap-2 text-gray-500">
      <span class="text-6xl">🎹</span>
      <p class="text-sm">{{ t('toneDetector.pressStart') }}</p>
    </div>
  </div>
</template>

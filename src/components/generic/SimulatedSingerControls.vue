<script setup lang="ts">
import type { SimulatedSinger } from '@/composables/useSimulatedSingers'
import { NOTE_OPTIONS_HIGH_TO_LOW } from '@/utils/noteUtils'

/* One simulated voice's slider panel, shared by the board test pages. The state
 * is a reactive object owned by useSimulatedSingers, so v-model writes straight
 * through — no emits to thread back up. Developer chrome, so the labels stay
 * plain English rather than going through i18n. */
type Props = {
  singer: SimulatedSinger
}
const props = defineProps<Props>()

const state = props.singer.state
</script>

<template>
  <div
    class="flex w-full flex-col gap-2 rounded-lg bg-(--p-content-background) p-4"
  >
    <span class="text-sm font-medium">{{ singer.label }}</span>

    <div class="flex w-full flex-wrap items-end gap-4">
      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Note</label>
        <PrimeSelect
          v-model="state.note"
          :options="[...NOTE_OPTIONS_HIGH_TO_LOW]"
          optionLabel="label"
          optionValue="value"
          class="min-w-20"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Octave</label>
        <PrimeSelect
          v-model="state.octave"
          :options="[1, 2, 3, 4, 5, 6].toReversed()"
          class="min-w-16"
        />
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Cents: {{ state.cents > 0 ? '+' : '' }}{{ state.cents }}
        </label>
        <input
          v-model.number="state.cents"
          type="range"
          min="-50"
          max="50"
          step="1"
          class="w-full"
        />
      </div>

      <div class="flex min-w-32 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Clarity: {{ Math.round(state.clarity * 100) }}%
        </label>
        <input
          v-model.number="state.clarity"
          type="range"
          min="0"
          max="1"
          step="0.01"
          class="w-full"
        />
      </div>

      <div class="flex min-w-28 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Jitter: ±{{ state.jitter }}¢
        </label>
        <input
          v-model.number="state.jitter"
          type="range"
          min="0"
          max="20"
          step="1"
          class="w-full"
        />
      </div>
    </div>
  </div>
</template>

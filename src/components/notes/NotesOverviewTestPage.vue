<script setup lang="ts">
import type { NoteName } from '@/utils/noteUtils'
import { NOTE_NAMES } from '@/utils/noteUtils'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import NotesOverviewDisplay from './NotesOverviewDisplay.vue'

const selectedNote = ref<NoteName>('C')
const selectedOctave = ref(4)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

/* Simulated voice — a live rAF signal (never the mic), so the sheet's
 * anti-flicker label gate promotes just as it would from a real singer. */
const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

onMounted(() => detection.start())
onUnmounted(() => detection.stop())

const { isPreviewEnabled } = useSettings()

/* Feed the simulated pitch as the preview only while "See your voice" is on, so
 * the toggle behaves exactly as it does with a real mic. */
const overridePreviewMidi = computed(() =>
  isPreviewEnabled.value ? (detection.noteInfo.value?.midiNote ?? null) : null,
)
const overridePreviewFrequency = computed(() =>
  isPreviewEnabled.value ? detection.frequency.value : null,
)

/* Sheet display toggles — local state standing in for the models NotesPage
 * would normally persist to localStorage. */
const toneLabelMode = ref<ToneLabelMode>('advanced')
const includeAccidentals = ref(false)
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
          :options="[...NOTE_NAMES]"
          class="min-w-20"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Octave</label>
        <PrimeSelect
          v-model="selectedOctave"
          :options="[1, 2, 3, 4, 5, 6].toReversed()"
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
    </div>

    <NotesOverviewDisplay
      :isActive="true"
      :disableIdlePreview="true"
      :overridePreviewMidi="overridePreviewMidi"
      :overridePreviewFrequency="overridePreviewFrequency"
      v-model:toneLabelMode="toneLabelMode"
      v-model:includeAccidentals="includeAccidentals"
    />
  </div>
</template>

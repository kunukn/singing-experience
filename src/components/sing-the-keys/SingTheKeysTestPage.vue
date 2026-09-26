<script setup lang="ts">
import type { NoteName } from '@/utils/noteUtils'
import { midiToNoteLabel, NOTE_OPTIONS_HIGH_TO_LOW } from '@/utils/noteUtils'
import SingTheKeysDisplay from './SingTheKeysDisplay.vue'
import {
  DEFAULT_SONG_ID,
  DEFAULT_SPEED,
  DEFAULT_START_OFFSET,
  type SongId,
  type SpeedOption,
} from './singTheKeysSongs'

/* Developer harness for Sing the Keys: the same display, but the voice is a
 * simulated detector driven by the controls below — no microphone, ever. The
 * settings are plain refs so the harness never writes the syng.singTheKeys*
 * keys the real page persists. */
const songId = ref<SongId>(DEFAULT_SONG_ID)
const startOffset = ref(DEFAULT_START_OFFSET)
const speed = ref<SpeedOption>(DEFAULT_SPEED)
const isMelodyGuideEnabled = ref(true)

const selectedNote = ref<NoteName>('G')
const selectedOctave = ref(3)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

/* Sing whatever note is due, so a full run scores 100% and the green blocks,
 * result line and confetti can be seen without a singer. */
const isAutoFollowEnabled = ref(true)

const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

function followTarget(midi: number | null) {
  if (!isAutoFollowEnabled.value || midi === null) return

  const { note, octave } = midiToNoteLabel(midi)
  selectedNote.value = note
  selectedOctave.value = octave
}
</script>

<template>
  <SingTheKeysDisplay
    :detection="detection"
    titleSuffix="(Test)"
    v-model:songId="songId"
    v-model:startOffset="startOffset"
    v-model:speed="speed"
    v-model:isMelodyGuideEnabled="isMelodyGuideEnabled"
    @targetChange="followTarget"
  >
    <div
      class="flex w-full max-w-3xl flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
    >
      <div class="flex items-center gap-2">
        <PrimeToggleSwitch
          v-model="isAutoFollowEnabled"
          inputId="sing-the-keys-auto-follow"
        />
        <label
          for="sing-the-keys-auto-follow"
          class="text-xs text-(--p-text-muted-color)"
          >Auto-follow melody</label
        >
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Note</label>
        <PrimeSelect
          v-model="selectedNote"
          :options="[...NOTE_OPTIONS_HIGH_TO_LOW]"
          optionLabel="label"
          optionValue="value"
          class="min-w-20"
          :disabled="isAutoFollowEnabled"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">Octave</label>
        <PrimeSelect
          v-model="selectedOctave"
          :options="[2, 3, 4, 5, 6].toReversed()"
          class="min-w-16"
          :disabled="isAutoFollowEnabled"
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
  </SingTheKeysDisplay>
</template>

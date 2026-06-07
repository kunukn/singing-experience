<script setup lang="ts">
import { NOTE_NAMES } from '@/utils/noteUtils'
import { VOZ_MELODIES } from './graceKellyMelodies'
import type { GraceKellyResult } from './useGraceKelly'

type Props = {
  game: GraceKellyResult
}

const props = defineProps<Props>()

const vozIndex = defineModel<number>('vozIndex', { required: true })
const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })

const { t } = useI18n()

const { setToneMode, warmUp } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    void warmUp().catch((error) =>
      debugLog('[GraceKelly] warmUp on tone-mode change failed', error),
    )
  },
})
setToneMode(storedToneMode.value)

const { isPlaying, isDone, activeNoteIndex, start, stop } = props.game

/* MIDI note → display label, e.g. 48 → "C3". */
function midiToToneLabel(midi: number): string {
  const noteIndex = ((midi % 12) + 12) % 12
  const octave = Math.floor(midi / 12) - 1

  return `${NOTE_NAMES[noteIndex]}${octave}`
}

/* Start-tone range E2 (MIDI 40) – A3 (MIDI 57), descending (high → low).
 * Generated locally because the shared START_TONE_OPTIONS bottoms out at G2. */
const START_TONE_MIDI_MIN = 40 // E2
const START_TONE_MIDI_MAX = 57 // A3
const startToneOptions = Array.from(
  { length: START_TONE_MIDI_MAX - START_TONE_MIDI_MIN + 1 },
  (_, index) => {
    const midiNote = START_TONE_MIDI_MAX - index

    return { label: midiToToneLabel(midiNote), midiNote }
  },
)

/* Sounding pitch of the note currently highlighted during playback (the start
 * tone transposes the melody, so the played pitch is startTone + offset). */
const currentToneLabel = computed(() => {
  if (activeNoteIndex.value === null) return null

  const note = VOZ_MELODIES[vozIndex.value].notes[activeNoteIndex.value]
  if (!note) return null

  return midiToToneLabel(startToneMidi.value + note.midiOffset)
})

const vozOptions = Array.from({ length: 6 }, (_, index) => ({
  label: `Voz ${index + 1}`,
  value: index,
}))

/* BPM = dotted quarter (the 6/8 beat unit). "BPM" kept untranslated. */
const bpmOptions = [50, 60, 70, 80, 90, 100, 110, 120, 130].map((value) => ({
  label: `${value} BPM`,
  value,
}))

function handleToggle() {
  if (isPlaying.value) {
    stop()
  } else if (isDone.value) {
    start(startToneMidi.value, vozIndex.value, bpm.value)
  } else {
    start(startToneMidi.value, vozIndex.value, bpm.value)
  }
}
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4"
    data-testid="grace-kelly-display"
  >
    <div class="flex w-full flex-wrap items-center gap-2 sm:gap-4">
      <PrimeSelect
        v-model="vozIndex"
        :options="vozOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="isPlaying"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.voz') }}
          </div>
        </template>
      </PrimeSelect>

      <PrimeSelect
        v-model="startToneMidi"
        :options="startToneOptions"
        optionLabel="label"
        optionValue="midiNote"
        size="small"
        :disabled="isPlaying"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.startTone') }}
          </div>
        </template>
      </PrimeSelect>

      <PrimeSelect
        v-model="bpm"
        :options="bpmOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="isPlaying"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.tempo') }}
          </div>
        </template>
      </PrimeSelect>

      <ToneModeSelect v-model="toneMode" class="min-w-30 flex-1" />

      <PrimeButton
        class="ms-auto min-w-24"
        :severity="isPlaying ? 'danger' : 'success'"
        size="small"
        rounded
        @click="handleToggle"
      >
        {{ isPlaying ? t('generic.stop') : t('generic.start') }}
      </PrimeButton>
    </div>

    <div class="mt-4 flex min-h-[2rem] flex-wrap items-center gap-4">
      <div
        class="flex flex-col items-center gap-2 text-center text-(--p-text-muted-color)"
      >
        <p class="text-sm">
          {{ t('graceKelly.subtitle') }}
        </p>
      </div>
      <p
        v-if="currentToneLabel"
        class="text-2xl font-semibold text-(--p-primary-color)"
        data-testid="grace-kelly-current-tone"
      >
        {{ currentToneLabel }}
      </p>
    </div>

    <GraceKellySheet
      :melody="VOZ_MELODIES[vozIndex]"
      :vozLabel="`Voz ${vozIndex + 1}`"
      :bpm="bpm"
      :activeNoteIndex="activeNoteIndex"
    />

    <div>
      <p>I could be brown, I could be blue</p>
      <p>I could be violet sky</p>
      <p>I could be hurtful, I could be purple</p>
      <p>I could be anything you like</p>
    </div>
  </div>
</template>

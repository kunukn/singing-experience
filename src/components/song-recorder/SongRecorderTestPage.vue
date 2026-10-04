<script setup lang="ts">
import {
  NOTE_NAMES,
  NOTE_OPTIONS_HIGH_TO_LOW,
  type NoteName,
} from '@/utils/noteUtils'
import SongRecorderDisplay from './SongRecorderDisplay.vue'
import { DEFAULT_BPM, DEFAULT_GRID, type Grid } from './songRecorderConstants'

/* Simulated voice only — test pages never open the microphone (AGENTS.md). */

const VOICE_ON_CLARITY = 0.95
const VOICE_OFF_CLARITY = 0

const selectedNote = ref<NoteName>('D')
const selectedOctave = ref(4)
const selectedCents = ref(0)
const selectedClarity = ref(VOICE_OFF_CLARITY)
const selectedJitter = ref(4)

const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

const bpm = ref(DEFAULT_BPM)
const grid = ref<Grid>(DEFAULT_GRID)
const isClickEnabled = ref(true)

const isVoiceOn = computed({
  get: () => selectedClarity.value >= VOICE_ON_CLARITY,
  set: (isOn) => {
    selectedClarity.value = isOn ? VOICE_ON_CLARITY : VOICE_OFF_CLARITY
  },
})

const displayRef = ref<InstanceType<typeof SongRecorderDisplay> | null>(null)

/* Twinkle Twinkle, first two phrases: [MIDI, beats]. Sung legato-ish — the
 * voice drops out for the last 15% of each note so repeated pitches split. */
const DEMO_MELODY: [number, number][] = [
  [60, 1],
  [60, 1],
  [67, 1],
  [67, 1],
  [69, 1],
  [69, 1],
  [67, 2],
  [65, 1],
  [65, 1],
  [64, 1],
  [64, 1],
  [62, 1],
  [62, 1],
  [60, 2],
]
const DEMO_VOICED_FRACTION = 0.85

let demoTimers: ReturnType<typeof setTimeout>[] = []

function clearDemo() {
  demoTimers.forEach(clearTimeout)
  demoTimers = []
}

function setSimulatedMidi(midi: number) {
  selectedNote.value = NOTE_NAMES[midi % 12]
  selectedOctave.value = Math.floor(midi / 12) - 1
}

/* Starts a take and, once recording begins after the count-in, sings the demo
 * melody on the beat, then stops. */
async function recordDemo() {
  const recorder = displayRef.value?.recorder
  if (!recorder) return

  clearDemo()
  isVoiceOn.value = false
  await recorder.record()

  const stopWatching = watch(
    recorder.isRecording,
    (isRecording) => {
      if (!isRecording) return

      stopWatching()
      const beatMs = 60_000 / bpm.value
      let cursorMs = 0
      for (const [midi, beats] of DEMO_MELODY) {
        const startMs = cursorMs
        const offMs = startMs + beats * beatMs * DEMO_VOICED_FRACTION
        demoTimers.push(
          setTimeout(() => {
            setSimulatedMidi(midi)
            isVoiceOn.value = true
          }, startMs),
          setTimeout(() => {
            isVoiceOn.value = false
          }, offMs),
        )
        cursorMs += beats * beatMs
      }
      demoTimers.push(setTimeout(() => recorder.stop(), cursorMs + beatMs))
    },
    { immediate: true },
  )
}

/* Raw segmenter output (before quantizing), for tuning the thresholds. Beats
 * are at the current tempo so early/late releases are easy to read. */
const rawEventRows = computed(() => {
  const events = displayRef.value?.recorder.events.value ?? []
  const beatMs = 60_000 / bpm.value

  return events.map(
    (event) =>
      `${NOTE_NAMES[event.midi % 12]}${Math.floor(event.midi / 12) - 1}  ` +
      `${(event.startMs / beatMs).toFixed(2)} → ${(event.endMs / beatMs).toFixed(2)} beats`,
  )
})

onUnmounted(clearDemo)
</script>

<template>
  <SongRecorderDisplay
    ref="displayRef"
    :detection="detection"
    v-model:bpm="bpm"
    v-model:grid="grid"
    v-model:isClickEnabled="isClickEnabled"
  >
    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
    >
      <PrimeButton
        size="small"
        severity="secondary"
        label="Record demo melody"
        data-testid="song-recorder-demo"
        @click="recordDemo"
      />

      <div class="flex items-center gap-2">
        <PrimeToggleSwitch v-model="isVoiceOn" inputId="voice-on" />
        <label for="voice-on" class="text-xs text-(--p-text-muted-color)">
          Voice on
        </label>
      </div>

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
          :options="[2, 3, 4, 5, 6].reverse()"
          class="min-w-16"
        />
      </div>

      <div class="flex min-w-40 flex-1 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Cents: {{ selectedCents > 0 ? '+' : '' }}{{ selectedCents }}
        </label>
        <PrimeSlider v-model="selectedCents" :min="-50" :max="50" />
      </div>

      <div class="flex min-w-28 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Jitter: ±{{ selectedJitter }}¢
        </label>
        <PrimeSlider v-model="selectedJitter" :min="0" :max="40" />
      </div>
    </div>

    <pre
      v-if="rawEventRows.length > 0"
      class="w-full rounded-lg bg-(--p-content-background) p-4 text-xs"
      data-testid="song-recorder-raw-events"
      >{{ rawEventRows.join('\n') }}</pre>
  </SongRecorderDisplay>
</template>

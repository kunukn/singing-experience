<script setup lang="ts">
import {
  NOTE_NAMES,
  NOTE_OPTIONS_HIGH_TO_LOW,
  type NoteName,
} from '@/utils/noteUtils'
import ScaleDetectorDisplay from './ScaleDetectorDisplay.vue'

/* Simulated voice only — test pages never open the microphone (AGENTS.md). */

const VOICE_ON_CLARITY = 0.95
const VOICE_OFF_CLARITY = 0

const selectedNote = ref<NoteName>('C')
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

const isVoiceOn = computed({
  get: () => selectedClarity.value >= VOICE_ON_CLARITY,
  set: (isOn) => {
    selectedClarity.value = isOn ? VOICE_ON_CLARITY : VOICE_OFF_CLARITY
  },
})

const displayRef = ref<InstanceType<typeof ScaleDetectorDisplay> | null>(null)

/* Runs as MIDI notes, sung in order. */
const DEMO_RUNS: { label: string; midis: number[] }[] = [
  { label: 'C D E F G', midis: [60, 62, 64, 65, 67] },
  { label: 'A B C D E', midis: [57, 59, 60, 62, 64] },
  { label: 'C D E G A', midis: [60, 62, 64, 67, 69] },
  { label: 'A C D E♭ E G', midis: [57, 60, 62, 63, 64, 67] },
  { label: 'G A B C D E', midis: [55, 57, 59, 60, 62, 64] },
  /* Chord arpeggios for the Chords tab. */
  { label: 'C E G', midis: [60, 64, 67] },
  { label: 'C F G', midis: [60, 65, 67] },
  { label: 'A C E G', midis: [57, 60, 64, 67] },
  { label: 'C E G B♭ D', midis: [60, 64, 67, 70, 74] },
]
const DEMO_NOTE_MS = 500
/* Silence between notes, longer than the segmenter's MIN_GAP_MS so each
 * note closes before the next starts. */
const DEMO_GAP_MS = 150

let demoTimers: ReturnType<typeof setTimeout>[] = []

function clearDemo() {
  demoTimers.forEach(clearTimeout)
  demoTimers = []
}

function setSimulatedMidi(midi: number) {
  selectedNote.value = NOTE_NAMES[midi % 12]
  selectedOctave.value = Math.floor(midi / 12) - 1
}

function singDemo(midis: number[]) {
  const detector = displayRef.value?.detector
  if (!detector) return

  clearDemo()
  isVoiceOn.value = false
  detector.reset()
  if (!detector.isListening.value) detector.toggleListening()

  midis.forEach((midi, index) => {
    const startMs = index * (DEMO_NOTE_MS + DEMO_GAP_MS)
    demoTimers.push(
      setTimeout(() => {
        setSimulatedMidi(midi)
        isVoiceOn.value = true
      }, startMs),
      setTimeout(() => {
        isVoiceOn.value = false
      }, startMs + DEMO_NOTE_MS),
    )
  })
}

onUnmounted(clearDemo)
</script>

<template>
  <ScaleDetectorDisplay
    ref="displayRef"
    :detection="detection"
    :simulateIdlePreview="true"
  >
    <div
      class="flex w-full flex-wrap items-end gap-4 rounded-lg bg-(--p-content-background) p-4"
    >
      <PrimeButton
        v-for="run in DEMO_RUNS"
        :key="run.label"
        size="small"
        severity="secondary"
        :label="`Sing ${run.label}`"
        :data-testid="`scale-detector-demo-${run.label}`"
        @click="singDemo(run.midis)"
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

      <div class="flex min-w-28 flex-col gap-1">
        <label class="text-xs text-(--p-text-muted-color)">
          Jitter: ±{{ selectedJitter }}¢
        </label>
        <PrimeSlider v-model="selectedJitter" :min="0" :max="40" />
      </div>
    </div>
  </ScaleDetectorDisplay>
</template>

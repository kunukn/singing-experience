<script setup lang="ts">
import { VOICE_RANGES } from '@/constants/voiceRanges'
import {
  NOTE_NAMES_HIGH_TO_LOW,
  midiToNoteLabel,
  type NoteName,
} from '@/utils/noteUtils'
import SingFlyDisplay from './SingFlyDisplay.vue'
import { useSingFlySettings } from './useSingFlySettings'

const { rangeIndex, gameDurationSec, difficulty } = useSingFlySettings()

/* Start the simulated singer at the dead center of the selected voice range so
 * the bird begins mid-screen — not pinned against (and crashing into) the
 * lethal ceiling/floor wall. */
const startRange = VOICE_RANGES[rangeIndex.value]
const startMidNote = midiToNoteLabel(
  Math.round((startRange.midiMin + startRange.midiMax) / 2),
)
const selectedNote = ref<NoteName>(startMidNote.note)
const selectedOctave = ref(startMidNote.octave)
const selectedCents = ref(0)
const selectedClarity = ref(0.95)
const selectedJitter = ref(2)

const showHitboxes = ref(true)
/* On by default — the page exists to inspect accuracy, and the orange preview
 * line is the pitch-true reference. Toggle off to declutter. */
const showPreviewLine = ref(true)
/* The page exists to watch the bird-motion algorithm, which the
 * cheat buttons drive directly. The simulated sliders above still work when
 * this is toggled off. */
const cheatButtons = ref(false)
/* true (default) = the deterministic scrub workflow (no RAF; the slider drives
 * elapsedMs). false = real-time clock: the game runs its own RAF so the cheat
 * buttons can be played live. The mic is never used in either mode. */
const manualClock = ref(true)

const detection = useSimulatedPitchDetection({
  note: selectedNote,
  octave: selectedOctave,
  cents: selectedCents,
  clarity: selectedClarity,
  jitter: selectedJitter,
})

onMounted(() => {
  void detection.start()
})

onUnmounted(() => {
  detection.stop()
})

const displayRef = ref<InstanceType<typeof SingFlyDisplay> | null>(null)

const gameState = computed(() => displayRef.value?.gameState ?? 'idle')
const elapsedMs = computed(() => displayRef.value?.elapsedMs ?? 0)
const isPlaying = computed(() => gameState.value === 'playing')

const scrubSeconds = ref(0)

watch(isPlaying, (playing) => {
  if (playing) scrubSeconds.value = 0
})

watch(scrubSeconds, (seconds) => {
  if (!isPlaying.value) return
  /* Real-time clock owns elapsedMs via its RAF — scrubbing would be a one-shot
   * nudge the next frame overwrites, so ignore it (the slider is disabled too). */
  if (!manualClock.value) return

  displayRef.value?.setElapsedMs(seconds * 1000)
})
</script>

<template>
  <div class="flex min-h-0 w-full flex-1 flex-col items-center gap-4">
    <h1 class="flex items-center gap-2 text-2xl font-semibold">
      <span>Singfly (Test)</span>
    </h1>

    <div
      class="flex w-full flex-col gap-3 rounded-lg bg-(--p-content-background) p-4"
    >
      <div v-if="!cheatButtons" class="flex flex-col gap-1">
        <div
          class="flex flex-wrap items-end gap-4"
          :class="{ 'pointer-events-none opacity-50': cheatButtons }"
        >
          <div class="flex flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">Note</label>
            <PrimeSelect
              v-model="selectedNote"
              :options="[...NOTE_NAMES_HIGH_TO_LOW]"
              :disabled="cheatButtons"
              class="min-w-20"
            />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-(--p-text-muted-color)">Octave</label>
            <PrimeSelect
              v-model="selectedOctave"
              :options="[2, 3, 4, 5, 6].toReversed()"
              :disabled="cheatButtons"
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
              :disabled="cheatButtons"
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
              :disabled="cheatButtons"
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
              :disabled="cheatButtons"
              class="w-full"
            />
          </div>
        </div>

        <p v-if="cheatButtons" class="text-xs text-(--p-text-muted-color)">
          Driven by the cheat buttons
        </p>
      </div>

      <div
        v-if="!cheatButtons"
        class="border-t border-(--p-content-border-color) pt-3"
      ></div>

      <div class="flex flex-wrap items-end gap-4">
        <div v-if="manualClock" class="flex min-w-60 flex-1 flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">
            Elapsed (s): {{ scrubSeconds.toFixed(1) }} / {{ gameDurationSec }}
          </label>
          <input
            v-model.number="scrubSeconds"
            type="range"
            min="0"
            :max="gameDurationSec"
            step="0.1"
            :disabled="!isPlaying || !manualClock"
            class="w-full"
          />
        </div>

        <div class="ms-auto flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">Hitboxes</label>
          <div class="flex items-center gap-2">
            <PrimeToggleSwitch v-model="showHitboxes" inputId="show-hitboxes" />
            <label
              for="show-hitboxes"
              class="text-xs text-(--p-text-muted-color)"
            >
              Show
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">
            Preview line
          </label>
          <div class="flex items-center gap-2">
            <PrimeToggleSwitch
              v-model="showPreviewLine"
              inputId="show-preview-line"
            />
            <label
              for="show-preview-line"
              class="text-xs text-(--p-text-muted-color)"
            >
              Show
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">
            Cheat buttons
          </label>
          <div class="flex items-center gap-2">
            <PrimeToggleSwitch v-model="cheatButtons" inputId="cheat-buttons" />
            <label
              for="cheat-buttons"
              class="text-xs text-(--p-text-muted-color)"
            >
              Enable
            </label>
          </div>
        </div>

        <div class="flex min-w-26 flex-col gap-1">
          <label class="text-xs text-(--p-text-muted-color)">
            Manual clock
          </label>
          <div class="flex items-center gap-2">
            <PrimeToggleSwitch v-model="manualClock" inputId="manual-clock" />
            <label
              for="manual-clock"
              class="text-xs text-(--p-text-muted-color)"
            >
              {{ manualClock ? 'Scrub' : 'Real-time' }}
            </label>
          </div>
        </div>

        <div class="flex flex-col gap-1 text-xs text-(--p-text-muted-color)">
          <span
            >State: <strong>{{ gameState }}</strong></span
          >
          <span>Live elapsed: {{ (elapsedMs / 1000).toFixed(1) }}s</span>
        </div>
      </div>
    </div>

    <SingFlyDisplay
      ref="displayRef"
      :key="`${cheatButtons ? 'cheat' : 'sim'}-${manualClock ? 'manual' : 'real'}`"
      class="w-full"
      :detection="detection"
      simulateIdlePreview
      :manualClock="manualClock"
      :showHitboxes="showHitboxes"
      :forcePreviewLine="showPreviewLine"
      :cheatButtons="cheatButtons"
      v-model:rangeIndex="rangeIndex"
      v-model:gameDurationSec="gameDurationSec"
      v-model:difficulty="difficulty"
    />
  </div>
</template>

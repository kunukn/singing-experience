<script setup lang="ts">
import {
  frequencyToMidi,
  midiToFrequency,
  midiToNoteLabel,
} from '@/utils/noteUtils'
import GraceKellySettingsRow from './GraceKellySettingsRow.vue'
import GraceKellySingSheet from './GraceKellySingSheet.vue'
import { VOZ_LABEL_KEYS } from './graceKellyConstants'
import {
  GRACE_KELLY_LYRIC_ABC,
  GRACE_KELLY_SYLLABLES,
} from './graceKellyLyrics'
import { VOZ_MELODIES } from './graceKellyMelodies'
import { isOnPitch as isWithinTolerance } from './graceKellySingPitch'
import { useStableSungLabel } from './useStableSungLabel'
import type { GraceKellyResult } from './useGraceKelly'

type Props = {
  /* A silent game instance (useGraceKelly({ silent: true })) — drives the sheet
   * timeline with no playback so the singer supplies the sound. */
  game: GraceKellyResult
  /* An audible instance — the ♪/Mute toggle plays the melody out loud so the
   * singer can hear it first. Never active at the same time as `game`. */
  previewGame: GraceKellyResult
}

const props = defineProps<Props>()

const vozIndex = defineModel<number>('vozIndex', { required: true })
const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })

const { t } = useI18n()

const {
  isPlaying,
  isPaused,
  isDone: singIsDone,
  activeNoteIndex: singActiveNoteIndex,
  start,
  pause,
  resume,
  stop,
} = props.game

/* Audible ♪/Mute melody preview — its own non-silent timeline, never running
 * at the same time as the silent sing timeline above. */
const {
  isPlaying: isPreviewPlaying,
  isDone: isPreviewDone,
  activeNoteIndex: previewActiveNoteIndex,
  start: startPreview,
  stop: stopPreview,
} = props.previewGame

/* The sheet reads one timeline at a time; surface whichever is active. The two
 * are mutually exclusive, so a simple coalesce / OR is unambiguous. */
const activeNoteIndex = computed(
  () => previewActiveNoteIndex.value ?? singActiveNoteIndex.value,
)
const isDone = computed(() => singIsDone.value || isPreviewDone.value)

function togglePreview() {
  if (isPreviewPlaying.value) {
    stopPreview()

    return
  }

  void startPreview(startToneMidi.value, vozIndex.value, bpm.value)
}

/* Live microphone pitch — its own AudioContext, independent of the (muted)
 * Tone engine driving the timeline. */
const {
  frequency,
  isClean,
  isListening,
  error,
  start: startMic,
  stop: stopMic,
} = usePitchDetection()

/* True while a sequence is playing or paused — the part/tone/tempo selects stay
 * locked for both so the running timeline can't be changed underneath it. */
const isRunning = computed(() => isPlaying.value || isPaused.value)

/* Either timeline busy — locks the selects/lyrics so the part/tone/tempo can't
 * change underneath a running sing OR an audible preview. */
const isBusy = computed(() => isRunning.value || isPreviewPlaying.value)

const { isPreviewEnabled } = useSettings()

/* "See your voice" idle preview — listens only while NOT running, so it never
 * competes with the sing-flow mic above for the stream. Toggling the button on
 * requests mic permission; if denied, useIdlePreview flips isPreviewEnabled
 * back off and micPermission disables the toggle. */
const {
  previewMidi,
  rawFrequency: previewFrequency,
  micPermission,
} = useIdlePreview({
  isGameActive: isRunning,
  isPlayingSequence: isPreviewPlaying,
  isEnabled: isPreviewEnabled,
})

/* Begin the silent timeline and open the mic together. */
function startSinging() {
  start(startToneMidi.value, vozIndex.value, bpm.value)
  void startMic()
}

function stopSinging() {
  stop()
  stopMic()
}

/* Stop listening whenever the timeline leaves the running state (manual stop or
 * the song finishing on its own); the mic keeps listening through a pause. */
watch(isRunning, (running) => {
  if (!running) stopMic()
})

onUnmounted(() => {
  stopMic()
})

const sheetRef = ref<{
  scrollToSyllable: (index: number) => void
} | null>(null)

/* Lyric syllables are tappable only when idle or done — during playback the sheet
 * auto-scrolls to the active note, so a tap would fight it. */
function scrollSheetToSyllable(flatIndex: number) {
  sheetRef.value?.scrollToSyllable(flatIndex)
}

/* Sounding pitch of the note currently highlighted (the start tone transposes
 * the melody, so the target pitch is startTone + offset). */
const currentToneLabel = computed(() => {
  if (activeNoteIndex.value === null) return null

  const note = VOZ_MELODIES[vozIndex.value].notes[activeNoteIndex.value]
  if (!note) return null

  return midiToNoteLabel(startToneMidi.value + note.midiOffset).label
})

/* Target frequency of the active note, against which the sung pitch is judged. */
const targetFrequency = computed(() => {
  if (activeNoteIndex.value === null) return null

  const note = VOZ_MELODIES[vozIndex.value].notes[activeNoteIndex.value]
  if (!note) return null

  return midiToFrequency(startToneMidi.value + note.midiOffset)
})

/* Continuous MIDI of the singer's live pitch (raw, not rounded), for the pitch
 * line's vertical position; null when no clean pitch is detected. */
const sungMidi = computed(() => {
  if (isRunning.value) {
    if (!isListening.value || !isClean.value || frequency.value === null)
      return null

    return frequencyToMidi(frequency.value)
  }

  /* Never show the live pitch line while the melody plays audibly — even with
   * "See your voice" on — or the mic would echo the speaker back as a line. */
  if (isPreviewPlaying.value) return null

  /* Idle "See your voice" preview — previewMidi is null while preview is off or
   * during the deaf window, which hides the pitch line. */
  if (previewMidi.value === null || previewFrequency.value === null) return null

  return frequencyToMidi(previewFrequency.value)
})

/* True when the sung pitch is within tolerance of the active note — turns the
 * pitch line green. */
const isOnPitch = computed(() => {
  if (frequency.value === null || targetFrequency.value === null) return false

  return isWithinTolerance(frequency.value, targetFrequency.value)
})

/* The singer's own de-flickered note label, stacked above the target tone
 * label on the sheet. Driven by the same `sungMidi` (so it inherits its
 * idle/preview/running null-gating); held 80ms before showing to avoid strobe. */
const { stableSungLabel } = useStableSungLabel({ sungMidi })

/* Flat reading-order index of the syllable currently being sung — the last
 * syllable whose starting tone has been reached. Held/tied tones keep the
 * previous syllable lit (the final "like" sustains over tones 32–33). -1 when
 * idle, so all syllables render in the default color. */
const activeSyllableIndex = computed(() => {
  if (activeNoteIndex.value === null) return -1

  let active = -1
  for (let index = 0; index < GRACE_KELLY_SYLLABLES.length; index++) {
    if (GRACE_KELLY_SYLLABLES[index].noteIndex <= activeNoteIndex.value) {
      active = index
    } else {
      break
    }
  }

  return active
})

const vozLabel = computed(() =>
  t(`graceKelly.vozLabels.${VOZ_LABEL_KEYS[vozIndex.value]}`),
)
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="grace-kelly-sing-display"
  >
    <GraceKellySettingsRow
      v-model:vozIndex="vozIndex"
      v-model:startToneMidi="startToneMidi"
      v-model:bpm="bpm"
      :isRunning="isBusy"
      :showToneMode="false"
    />

    <div class="flex min-w-50 items-baseline gap-2">
      <PrimeButton
        v-if="isRunning"
        severity="danger"
        size="small"
        rounded
        class="min-w-24"
        @click="stopSinging"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <PrimeButton
        v-if="isPlaying"
        class="min-w-24"
        severity="warn"
        size="small"
        rounded
        @click="pause"
      >
        {{ t('generic.pause') }}
      </PrimeButton>
      <PrimeButton
        v-if="isPaused"
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        @click="resume"
      >
        {{ t('generic.resume') }}
      </PrimeButton>
      <PrimeButton
        v-if="!isRunning"
        class="min-w-24"
        severity="success"
        size="small"
        rounded
        :disabled="isPreviewPlaying"
        @click="startSinging"
      >
        {{ t('graceKelly.sing') }}
      </PrimeButton>

      <PrimeButton
        v-if="!isRunning"
        class="min-w-24"
        :class="{ 'toggle-sequence-idle': !isPreviewPlaying }"
        :severity="isPreviewPlaying ? 'warn' : 'secondary'"
        size="small"
        rounded
        @click="togglePreview"
      >
        {{
          isPreviewPlaying
            ? t('generic.muteButton')
            : t('generic.previewButton')
        }}
      </PrimeButton>

      <ToggleIconButton
        v-model="isPreviewEnabled"
        iconOn="pi pi-microphone"
        iconOff="pi pi-microphone"
        :label="t('generic.previewSoundLabel')"
        :disabled="micPermission === 'denied' || isBusy"
      />
    </div>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>

    <div class="w-full max-w-full">
      <div class="mb-1 flex items-center justify-center gap-2">
        <p>{{ t('graceKelly.subtitle') }}:</p>
        <h2 class="text-lg font-semibold text-(--p-text-color)">
          {{ vozLabel }}
        </h2>
      </div>

      <GraceKellySingSheet
        ref="sheetRef"
        :melody="VOZ_MELODIES[vozIndex]"
        :vozLabel="vozLabel"
        :startToneMidi="startToneMidi"
        :bpm="bpm"
        :activeNoteIndex="activeNoteIndex"
        :isDone="isDone"
        :lyrics="GRACE_KELLY_LYRIC_ABC"
        :activeSyllableIndex="activeSyllableIndex"
        :currentToneLabel="currentToneLabel"
        :sungToneLabel="stableSungLabel"
        :sungMidi="sungMidi"
        :isOnPitch="isOnPitch"
      />
    </div>

    <GraceKellyLyrics
      :activeSyllableIndex="activeSyllableIndex"
      :isInteractive="!isBusy"
      @syllableClick="scrollSheetToSyllable"
    />
  </div>
</template>

<style scoped lang="css">
.toggle-sequence-idle {
  padding-block: 0;
  font-size: 1.2rem;
}
</style>

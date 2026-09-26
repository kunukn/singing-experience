<script setup lang="ts">
import type { PianoPreviewLaneId } from '@/components/piano/pianoPreview'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  C3_MIDI,
  frequencyToMidi,
  midiToFrequency,
  toAccidentalGlyph,
} from '@/utils/noteUtils'
import { isOnPitch } from '@/utils/pitchMatch'
import { useWindowSize } from '@vueuse/core'
import SingTheKeysLane from './SingTheKeysLane.vue'
import SingTheKeysSettingsRow from './SingTheKeysSettingsRow.vue'
import { SONGS, type SongId, type SpeedOption } from './singTheKeysSongs'
import { beatFlashAt, beatPulseAt, songMidiRange } from './singTheKeysTimeline'
import { useSingTheKeys } from './useSingTheKeys'

type PitchDetectionInput = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  clarity: Readonly<Ref<number>>
  isListening: Readonly<Ref<boolean>>
  isClean: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  start: () => void | Promise<void>
  stop: () => void
}

type Props = {
  /* The microphone source for a run: scoring and the sung-pitch line read it.
   * The real page passes usePitchDetection; the test page passes a simulated
   * detector. */
  detection: PitchDetectionInput
  titleSuffix?: string
  /* Test pages: route the idle "See your voice" preview through `detection`
   * instead of opening the real mic via useIdlePreview. */
  simulateIdlePreview?: boolean
}

const props = defineProps<Props>()

const songId = defineModel<SongId>('songId', { required: true })
const startOffset = defineModel<number>('startOffset', { required: true })
const speed = defineModel<SpeedOption>('speed', { required: true })
const isMelodyGuideEnabled = defineModel<boolean>('isMelodyGuideEnabled', {
  required: true,
})
/* Pulse lines falling with the blocks, so the beat is visible without a
 * metronome. Visual only, so it can be flipped mid-run. */
const isBeatLinesEnabled = defineModel<boolean>('isBeatLinesEnabled', {
  required: true,
})
/* Beat lights: the hit line glows light blue on each beat, where the singer is
 * already looking. Visual only, like the lines. */
const areBeatLightsEnabled = defineModel<boolean>('areBeatLightsEnabled', {
  required: true,
})

/* The note currently due, for a test page that wants to sing along by itself. */
const emit = defineEmits<{ targetChange: [midi: number | null] }>()

const { t } = useI18n()

const { frequency, noteInfo, isListening, isClean, error, start, stop } =
  props.detection

const song = computed(() => SONGS[songId.value])
const tonicMidi = computed(() => C3_MIDI + startOffset.value)
/* Keyboard span: the transposed song plus a semitone of margin, on white keys. */
const range = computed(() => songMidiRange(song.value, tonicMidi.value))

/* The same spelling the piano page uses, so a singer who set D♭ there sees D♭
 * on the blocks here too. */
const accidentalStyle = useAccidentalStyle('syng.pianoAccidentals', 'sharp')

const game = useSingTheKeys()
const {
  isPlaying,
  isDone,
  timeline,
  elapsedMs,
  isShowingEnding,
  isEndingSettled,
  laneElapsedMs,
  activeNoteIndex,
  noteDurationsMs,
} = game

/* Drives the result panel + the green blocks. Set when the song finishes on its
 * own; cleared on a fresh start and when the singer changes song/key/speed at
 * the result screen. */
const showResult = ref(false)

/* Re-lay the tune whenever a setting changes while idle, so the still preview
 * in the lane (and the keyboard span) always match the selects. */
watch(
  [song, tonicMidi, speed],
  () => {
    showResult.value = false
    game.preview(song.value, tonicMidi.value, speed.value)
  },
  { immediate: true },
)

const targetMidi = computed(() => {
  if (activeNoteIndex.value === null) return null

  return timeline.value.notes[activeNoteIndex.value]?.midi ?? null
})

watch(targetMidi, (midi) => emit('targetChange', midi))

const targetFrequency = computed(() =>
  targetMidi.value === null ? null : midiToFrequency(targetMidi.value),
)

const isOnPitchForScore = computed(() => {
  if (frequency.value === null || targetFrequency.value === null) return false

  return isOnPitch(
    frequency.value,
    targetFrequency.value,
    SCORE_TOLERANCE_CENTS,
  )
})

/* Scoring is off while the melody guide plays. The guide tone is the exact
 * target pitch inside the exact scoring window: with echo cancellation off it
 * scores itself, and with echo cancellation on the canceller damps the
 * singer's own sustained tone as well, so neither mic profile gives an honest
 * number. Guide on is practice — the lane, key wash and sung line still work,
 * but no tally, result or confetti. */
const isScored = computed(() => !isMelodyGuideEnabled.value)
const isScoring = computed(() => isPlaying.value && isScored.value)

const {
  reachedThreshold,
  reset: resetScore,
  onPitchRatio,
  correctNoteIndices,
} = useDwellSingScore({
  isPlaying: isScoring,
  isOnPitch: isOnPitchForScore,
  activeNoteIndex,
  noteDurationsMs,
})

const scorePercent = computed(() => Math.round(onPitchRatio.value * 100))

/* Live tally beside the Stop button, so the end score is never a surprise.
 * A note is missed once it has fully passed the hit line without being hit —
 * the same rule the lane uses to paint a block red. */
const hitCount = computed(() => correctNoteIndices.value.length)
const missCount = computed(() => {
  const hit = new Set(correctNoteIndices.value)

  return timeline.value.notes.filter(
    (note) =>
      !hit.has(note.index) && note.startMs + note.durationMs <= elapsedMs.value,
  ).length
})

/* Green blocks live while singing and on the result screen; none while idle
 * so a stale map never sits over a re-laid tune. */
const resultNoteIndices = computed(() =>
  showResult.value || isPlaying.value ? correctNoteIndices.value : [],
)

/* Only while playing: idle sits at elapsedMs 0, where a song without a pickup
 * has a line, and the hit line would glow on the still preview. The coloured
 * beat light takes over the hit line when on, so the orange flash stands
 * down rather than mixing with it. */
const beatFlash = computed(() =>
  isPlaying.value && isBeatLinesEnabled.value && !areBeatLightsEnabled.value
    ? beatFlashAt(timeline.value.beatLines, laneElapsedMs.value)
    : null,
)

const beatLight = computed(() =>
  isPlaying.value && areBeatLightsEnabled.value
    ? beatPulseAt(timeline.value.beatLines, laneElapsedMs.value)
    : null,
)

const isTargetCorrect = computed(
  () =>
    activeNoteIndex.value !== null &&
    correctNoteIndices.value.includes(activeNoteIndex.value),
)

const { isPreviewEnabled } = useSettings()

/* "See your voice" — the live pitch while idle, so the singer can find the
 * first key before pressing Start. Listens only while no run is playing, the
 * same split as Grace Kelly "Sing live": during a run the scoring mic draws the
 * line, and in practice mode nothing does. The setter keeps the shared setting
 * writable, so useIdlePreview can flip it off when permission is denied; the
 * getter is always false on a simulated page, so the real mic never opens. */
const isRealIdlePreviewEnabled = computed({
  get: () => isPreviewEnabled.value && !props.simulateIdlePreview,
  set: (enabled: boolean) => {
    isPreviewEnabled.value = enabled
  },
})

const {
  rawFrequency: idleFrequency,
  rawNoteInfo: idleNoteInfo,
  rawIsClean: idleIsClean,
  isPreviewListening: isIdleListening,
  micPermission,
} = useIdlePreview({
  isGameActive: isPlaying,
  isEnabled: isRealIdlePreviewEnabled,
})

/* The pitch the lines are drawn from: the idle preview between runs, the run's
 * detector while playing. A simulated page has only the one detector. */
const isIdleSource = computed(
  () => !isPlaying.value && !props.simulateIdlePreview,
)
const liveFrequency = computed(() =>
  isIdleSource.value ? idleFrequency.value : frequency.value,
)
const liveNoteInfo = computed(() =>
  isIdleSource.value ? idleNoteInfo.value : noteInfo.value,
)
const isLiveClean = computed(() =>
  isIdleSource.value ? idleIsClean.value : isClean.value,
)
const isLiveListening = computed(() =>
  isIdleSource.value ? isIdleListening.value : isListening.value,
)

/* Continuous MIDI of the singer's live pitch for the lane and key-track lines;
 * null when nothing clean is detected. */
const sungMidi = computed(() => {
  if (
    !isLiveListening.value ||
    !isLiveClean.value ||
    liveFrequency.value === null
  )
    return null

  return frequencyToMidi(liveFrequency.value)
})

/* One lane through the keyboard's own preview pipeline — the dashed line and
 * note chip on the keys, same as the piano page's single-voice mode. */
const previewLanes = computed<Array<DuetLane & { laneId: PianoPreviewLaneId }>>(
  () => {
    const info = liveNoteInfo.value
    const isVisible = sungMidi.value !== null && info !== null

    return [
      {
        previewMidi: isVisible ? info.midiNote : null,
        previewFrequency: isVisible ? liveFrequency.value : null,
        previewNoteLabel: isVisible
          ? toAccidentalGlyph(`${info.note}${info.octave}`)
          : null,
        laneId: 'low',
      },
    ]
  },
)

/* Lane height follows the viewport so the keyboard stays on screen under it:
 * 40% of the height, never shorter than 240px nor taller than 360px. */
const LANE_MIN_HEIGHT = 240
const LANE_MAX_HEIGHT = 360
const LANE_VIEWPORT_FRACTION = 0.4
const { height: windowHeight } = useWindowSize()
const laneHeight = computed(() =>
  Math.round(
    Math.min(
      LANE_MAX_HEIGHT,
      Math.max(LANE_MIN_HEIGHT, windowHeight.value * LANE_VIEWPORT_FRACTION),
    ),
  ),
)

/* Open the mic first so a permission prompt never eats the lead-in, then
 * launch the timeline. In practice mode (guide on) the mic stays closed: with
 * the speaker playing the melody, the detected line whips between the guide
 * tone, the voice and their echo and only confuses — and nothing is scored. */
async function startSinging() {
  showResult.value = false
  resetScore()
  if (isScored.value) {
    await start()
    if (!isListening.value) return
  }

  await game.start({
    song: song.value,
    tonicMidi: tonicMidi.value,
    speed: speed.value,
    isMelodyGuideEnabled: isMelodyGuideEnabled.value,
  })
}

function stopSinging() {
  game.stop()
}

/* The mic closes whenever the timeline leaves playing — manual stop or the song
 * finishing on its own. */
watch(isPlaying, (playing) => {
  if (!playing) stop()
})

/* Simulated idle preview: the one detector runs between runs while the toggle
 * is on. Declared after the watcher above so a run ending stops, then restarts
 * it. A scored run keeps the detector it just started; practice mode closes it
 * like the real mic. */
const isSimulatedIdlePreviewOn = computed(
  () =>
    !!props.simulateIdlePreview && isPreviewEnabled.value && !isPlaying.value,
)
watch(
  isSimulatedIdlePreviewOn,
  (isOn) => {
    if (isOn) void start()
    else if (!isScoring.value) stop()
  },
  { immediate: true },
)

const { fireConfetti } = useConfettiStore()

/* Reveal the result on a natural finish (never a manual stop) and celebrate
 * when enough notes were correct. */
watch(isDone, (done) => {
  if (!done || !isScored.value) return

  showResult.value = true
  if (reachedThreshold.value) fireConfetti()
})

onUnmounted(() => {
  stop()
})
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="sing-the-keys-display"
  >
    <div class="text-center">
      <h1 class="flex items-center justify-center gap-2 text-2xl font-semibold">
        <span>🎹</span>
        <span>{{ t('singTheKeys.title') }} {{ titleSuffix }}</span>
      </h1>
      <p class="text-sm text-(--p-text-muted-color)">
        {{ t('singTheKeys.subtitle') }}
      </p>
    </div>

    <SingTheKeysSettingsRow
      v-model:songId="songId"
      v-model:startOffset="startOffset"
      v-model:speed="speed"
      :isRunning="isPlaying"
    />

    <div v-if="showResult" class="flex flex-col items-center gap-1">
      <p
        class="text-3xl font-bold tabular-nums"
        :class="
          reachedThreshold ? 'text-(--p-green-400)' : 'text-(--p-text-color)'
        "
        data-testid="sing-the-keys-result"
      >
        {{ t('singTheKeys.scoreCorrect', { percent: scorePercent }) }}
      </p>
    </div>

    <!-- Centred, with a little top padding: the scroller clips vertically too,
         and a focus ring on the toggle would otherwise lose its top edge. The
         Start/Stop buttons take the toggle's 35px height so the row is even. -->
    <EdgeFadeScroller
      class="flex min-w-50 items-center justify-center-safe gap-2 pt-1 pb-2"
    >
      <PrimeButton
        v-if="isPlaying"
        severity="danger"
        size="small"
        rounded
        class="min-h-8.75 min-w-20"
        @click="stopSinging"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <!-- Symbols and digits only, so nothing here needs translating. -->
      <span
        v-if="isScoring"
        class="flex items-center gap-2 text-sm font-semibold tabular-nums"
        data-testid="sing-the-keys-tally"
        :data-hits="hitCount"
        :data-misses="missCount"
      >
        <span class="text-(--p-green-400)">✓ {{ hitCount }}</span>
        <span class="text-(--p-red-400)">✗ {{ missCount }}</span>
      </span>

      <PrimeButton
        v-if="!isPlaying"
        class="min-h-8.75 min-w-20"
        severity="success"
        size="small"
        rounded
        @click="startSinging"
      >
        {{ showResult ? t('generic.playAgain') : t('generic.start') }}
      </PrimeButton>

      <ToggleIconButton
        v-model="isMelodyGuideEnabled"
        iconOn="pi pi-volume-up"
        iconOff="pi pi-volume-off"
        :label="t('singTheKeys.melodyGuide')"
        :disabled="isPlaying"
      />

      <ToggleIconButton
        v-model="isBeatLinesEnabled"
        iconOn="pi pi-bars"
        iconOff="pi pi-bars"
        :label="t('singTheKeys.beatLines')"
      />

      <ToggleIconButton
        v-model="areBeatLightsEnabled"
        iconOn="pi pi-sun"
        iconOff="pi pi-sun"
        :label="t('singTheKeys.beatLights')"
      />

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="
          isPlaying || (!simulateIdlePreview && micPermission === 'denied')
        "
      />
    </EdgeFadeScroller>

    <p v-if="error" class="text-sm text-(--p-red-400)">{{ error }}</p>

    <slot />

    <!-- Only the keyboard widens (up to 1600px), matching the piano page. -->
    <div class="mx-auto w-full max-w-400">
      <PianoDisplay
        :midiMin="range.midiMin"
        :midiMax="range.midiMax"
        :previewLanes="previewLanes"
        :isPreviewEnabled="true"
        toneLabelMode="simple"
        :accidentalStyle="accidentalStyle"
        :areKeyboardHintsVisible="false"
        :targetMidi="targetMidi"
        :isTargetCorrect="isTargetCorrect"
      >
        <template #lane="{ layout }">
          <SingTheKeysLane
            :notes="timeline.notes"
            :layout="layout"
            :laneHeight="laneHeight"
            :elapsedMs="laneElapsedMs"
            :isShowingEnding="isShowingEnding"
            :isEndingSettled="isEndingSettled"
            :activeNoteIndex="activeNoteIndex"
            :correctNoteIndices="resultNoteIndices"
            :accidentalStyle="accidentalStyle"
            :sungMidi="sungMidi"
            :sungFrequency="liveFrequency"
            :isScored="isScored"
            :beatLines="isBeatLinesEnabled ? timeline.beatLines : []"
            :beatFlash="beatFlash"
            :beatLight="beatLight"
          />
        </template>
      </PianoDisplay>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PianoPreviewLaneId } from '@/components/piano/pianoPreview'
import type { DuetLane } from '@/composables/useDuetPitchDetection'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToMidi,
  midiToFrequency,
  snapFrequencyToSemitone,
  toAccidentalGlyph,
} from '@/utils/noteUtils'
import { isOnPitch } from '@/utils/pitchMatch'
import { useMediaQuery, useWindowSize } from '@vueuse/core'
import SingTheKeysLane from './SingTheKeysLane.vue'
import SingTheKeysSettingsRow from './SingTheKeysSettingsRow.vue'
import {
  SONGS,
  tonicMidiForRange,
  type SongId,
  type SpeedOption,
} from './singTheKeysSongs'
import {
  aimedNoteIndicesAt,
  beatFlashAt,
  KEYBOARD_MIN_SEMITONE_UNIT,
  SCORE_LAG_MS,
  songMidiRange,
} from './singTheKeysTimeline'
import { useMetronomeMask } from './useMetronomeMask'
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
const rangeOffset = defineModel<number>('rangeOffset', { required: true })
const speed = defineModel<SpeedOption>('speed', { required: true })
/* Pulse lines falling with the blocks, so the beat is visible with the
 * metronome off. Visual only, so it can be flipped mid-run. */
const isBeatLinesEnabled = defineModel<boolean>('isBeatLinesEnabled', {
  required: true,
})
/* A short tick on every beat line, in a scored run and a preview alike. Queued
 * a frame at a time (see useSingTheKeys), so it too can be flipped mid-run. */
const isMetronomeEnabled = defineModel<boolean>('isMetronomeEnabled', {
  required: true,
})
/* Snap: the sung line and note chip sit on the nearest key instead of drifting
 * with the cents — child friendly, a slightly flat G3 shows as G3. Visual only,
 * like the lines. */
const isPitchSnapEnabled = defineModel<boolean>('isPitchSnapEnabled', {
  required: true,
})
/* Light and sparks on the hit line when a note is collected. Visual only, so
 * it can be flipped mid-run; off, the lane behaves as if it had none. */
const isHitEffectsEnabled = defineModel<boolean>('isHitEffectsEnabled', {
  required: true,
})
/* The computer-key chips on the piano keys. Display only, like on the piano
 * page: the keys play from the keyboard whether or not the chips are drawn. */
const areKeyboardHintsVisible = defineModel<boolean>(
  'areKeyboardHintsVisible',
  { required: true },
)

/* The chips are only drawn where a physical keyboard exists (see keyChar in
 * PianoDisplay), so on touch the toggle would be a no-op control. */
const isCoarsePointer = useMediaQuery('(pointer: coarse)')

/* The note currently due, for a test page that wants to sing along by itself. */
const emit = defineEmits<{ targetChange: [midi: number | null] }>()

const { t } = useI18n()

const { isListening, error, start, stop } = props.detection

const song = computed(() => SONGS[songId.value])
const tonicMidi = computed(() =>
  tonicMidiForRange(song.value, rangeOffset.value),
)
/* Keyboard span: the transposed song plus a semitone of margin, on white keys. */
const range = computed(() => songMidiRange(song.value, tonicMidi.value))

/* The same spelling the piano page uses, so a singer who set D♭ there sees D♭
 * on the blocks here too. */
const accidentalStyle = useAccidentalStyle('syng.pianoAccidentals', 'sharp')

const game = useSingTheKeys({ isMetronomeEnabled })
const {
  isPlaying,
  isDone,
  timeline,
  elapsedMs,
  isShowingEnding,
  isEndingSettled,
  laneElapsedMs,
  activeNoteIndex,
  scoredNoteIndex,
  noteDurationsMs,
  laneScrollMaxMs,
  canScrollLane,
  isMetronomeSounding,
} = game

/* The run's pitch, with the metronome's tick kept out of it: anything the mic
 * reports off the keyboard while a tick sounds is the tick, not the singer. */
const { frequency, noteInfo, isClean } = useMetronomeMask(
  props.detection,
  isMetronomeSounding,
  () => midiToFrequency(range.value.midiMin),
  () => midiToFrequency(range.value.midiMax),
)

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

/* The pitch the scorer wants right now. Not targetMidi's: the detected pitch
 * runs SCORE_LAG_MS behind the voice, so it is held against the note that was
 * due then, while the keys and lane show the one due now. */
const scoredFrequency = computed(() => {
  if (scoredNoteIndex.value === null) return null

  const midi = timeline.value.notes[scoredNoteIndex.value]?.midi

  return midi === undefined ? null : midiToFrequency(midi)
})

const isOnPitchForScore = computed(() => {
  if (frequency.value === null || scoredFrequency.value === null) return false

  return isOnPitch(
    frequency.value,
    scoredFrequency.value,
    SCORE_TOLERANCE_CENTS,
  )
})

/* Whether the current (or last) run is scored, fixed when it starts: Start is
 * a scored run, ♪ a preview that plays the melody. The two never mix — the
 * melody is the exact target pitch inside the exact scoring window: with echo
 * cancellation off it scores itself, and with echo cancellation on the
 * canceller damps the singer's own sustained tone as well, so neither mic
 * profile gives an honest number. A preview keeps the lane and key wash, but
 * has no tally, result or confetti, and the lane paints passed blocks from
 * this so its unsung notes never turn red. */
const isRunScored = ref(true)
const isScoring = computed(() => isPlaying.value && isRunScored.value)

/* The idle preview is cents-coloured like every program's. During a run green
 * must keep meaning "hit", and a snapped pitch is always 0¢ — both keep the
 * neutral orange. */
const isPreviewColoredByCents = computed(
  () => !isPlaying.value && !isPitchSnapEnabled.value,
)

const startLabel = computed(() =>
  showResult.value ? t('generic.playAgain') : t('generic.start'),
)

const {
  reachedThreshold,
  reset: resetScore,
  onPitchRatio,
  correctNoteIndices,
} = useDwellSingScore({
  isPlaying: isScoring,
  isOnPitch: isOnPitchForScore,
  activeNoteIndex: scoredNoteIndex,
  noteDurationsMs,
})

const scorePercent = computed(() => Math.round(onPitchRatio.value * 100))

/* Live tally beside the Stop button, so the end score is never a surprise.
 * A note is missed once its scoring window has closed without a hit — that is
 * SCORE_LAG_MS after it passed the hit line, the same rule the lane uses to
 * paint a block red. */
const hitCount = computed(() => correctNoteIndices.value.length)
const missCount = computed(() => {
  const hit = new Set(correctNoteIndices.value)

  return timeline.value.notes.filter(
    (note) =>
      !hit.has(note.index) &&
      note.startMs + note.durationMs + SCORE_LAG_MS <= elapsedMs.value,
  ).length
})

/* Early praise: the due block and the next one coming turn a lighter blue while
 * the singer is on their pitch, before any point is collected. Scored runs
 * only — a ♪ preview has no mic. Same pitch and tolerance as the scorer, so a
 * lit block is one that would score. */
const aimedNoteIndices = computed(() =>
  isScoring.value
    ? aimedNoteIndicesAt(
        timeline.value.notes,
        elapsedMs.value,
        frequency.value,
        SCORE_TOLERANCE_CENTS,
      )
    : [],
)

/* Green blocks live while singing and on the result screen; none while idle
 * so a stale map never sits over a re-laid tune. */
const resultNoteIndices = computed(() =>
  showResult.value || isPlaying.value ? correctNoteIndices.value : [],
)

/* Only while playing: idle sits at elapsedMs 0, where a song without a pickup
 * has a line, and the hit line would glow on the still preview. */
const beatFlash = computed(() =>
  isPlaying.value && isBeatLinesEnabled.value
    ? beatFlashAt(timeline.value.beatLines, laneElapsedMs.value)
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
 * line, and in a ♪ preview nothing does. The setter keeps the shared setting
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
const rawLiveFrequency = computed(() =>
  isIdleSource.value ? idleFrequency.value : frequency.value,
)
/* Snapped to the equal-tempered pitch of the nearest semitone. Scoring keeps
 * the raw pitch: its ±50 cent window is already the nearest-key rule, so the
 * key the snapped line lands on is the key that scores. */
const liveFrequency = computed(() => {
  const hz = rawLiveFrequency.value
  if (hz === null || !isPitchSnapEnabled.value) return hz

  return snapFrequencyToSemitone(hz)
})
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

/* A scored run opens the mic first, so a permission prompt never eats the
 * lead-in, then launches the timeline without the melody. A preview plays it
 * and keeps the mic closed: with the speaker playing, the detected line whips
 * between the melody, the voice and their echo and only confuses — and
 * nothing is scored. It also skips the lead-in: that is get-ready time for a
 * singer, and a listener wants the melody at once. */
async function startRun(isScored: boolean) {
  showResult.value = false
  resetScore()
  isRunScored.value = isScored
  if (isScored) {
    await start()
    if (!isListening.value) return
  }

  await game.start({
    song: song.value,
    tonicMidi: tonicMidi.value,
    speed: speed.value,
    isMelodyGuideEnabled: !isScored,
    hasLeadIn: isScored,
  })
}

function startSinging() {
  return startRun(true)
}

function startPreview() {
  return startRun(false)
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
 * it. A scored run keeps the detector it just started; a preview closes it
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
  if (!done || !isRunScored.value) return

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
        <span>{{ t('home.programs.singTheKeys.name') }} {{ titleSuffix }}</span>
      </h1>
      <p class="text-sm text-(--p-text-muted-color)">
        {{ t('singTheKeys.subtitle') }}
      </p>
    </div>

    <SingTheKeysSettingsRow
      v-model:songId="songId"
      v-model:rangeOffset="rangeOffset"
      v-model:speed="speed"
      :song="song"
      :accidentalStyle="accidentalStyle"
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
        {{ t('generic.scoreCorrect', { percent: scorePercent }) }}
      </p>
    </div>

    <!-- Centred, with a little top padding: the scroller clips vertically too,
         and a focus ring on the toggle would otherwise lose its top edge. The
         Start/Stop buttons take the toggle's 35px height so the row is even. -->
    <EdgeFadeScroller
      class="flex max-w-full min-w-50 items-center justify-center-safe gap-2 pt-1 pb-2"
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
        {{ startLabel }}
      </PrimeButton>

      <PrimeButton
        v-if="!isPlaying"
        class="toggle-sequence-idle min-h-8.75 min-w-20"
        severity="secondary"
        size="small"
        rounded
        :aria-label="t('singTheKeys.preview')"
        :title="t('singTheKeys.preview')"
        @click="startPreview"
      >
        {{ t('generic.previewButton') }}
      </PrimeButton>

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="
          isPlaying || (!simulateIdlePreview && micPermission === 'denied')
        "
      />

      <ToggleIconButton
        v-model="isBeatLinesEnabled"
        iconOn="pi pi-bars"
        iconOff="pi pi-bars"
        :label="t('generic.lines')"
      />

      <ToggleIconButton
        v-model="isMetronomeEnabled"
        iconOn="pi pi-stopwatch"
        iconOff="pi pi-stopwatch"
        :label="t('generic.beat')"
      />

      <ToggleIconButton
        v-model="isPitchSnapEnabled"
        iconOn="pi pi-bullseye"
        iconOff="pi pi-bullseye"
        :label="t('generic.pitchSnap')"
      />

      <ToggleIconButton
        v-model="isHitEffectsEnabled"
        iconOn="pi pi-sparkles"
        iconOff="pi pi-sparkles"
        :label="t('generic.sparkles')"
      />

      <KeyboardHintsToggle
        v-if="!isCoarsePointer"
        v-model="areKeyboardHintsVisible"
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
        :shouldColorByCents="isPreviewColoredByCents"
        toneLabelMode="simple"
        :isOctaveShownOnC="true"
        :accidentalStyle="accidentalStyle"
        :areKeyboardHintsVisible="areKeyboardHintsVisible"
        :targetMidi="targetMidi"
        :isTargetCorrect="isTargetCorrect"
        :isPressGlowBlockShaped="true"
        :minSemitoneUnit="KEYBOARD_MIN_SEMITONE_UNIT"
      >
        <template #lane="{ layout, playKey }">
          <SingTheKeysLane
            :notes="timeline.notes"
            :layout="layout"
            :laneHeight="laneHeight"
            :elapsedMs="laneElapsedMs"
            :isShowingEnding="isShowingEnding"
            :isEndingSettled="isEndingSettled"
            :areBlocksPressable="!isPlaying"
            :activeNoteIndex="activeNoteIndex"
            :correctNoteIndices="resultNoteIndices"
            :aimedNoteIndices="aimedNoteIndices"
            :accidentalStyle="accidentalStyle"
            :sungMidi="sungMidi"
            :sungFrequency="liveFrequency"
            :shouldColorByCents="isPreviewColoredByCents"
            :isScored="isRunScored"
            :scoreLagMs="SCORE_LAG_MS"
            :beatLines="isBeatLinesEnabled ? timeline.beatLines : []"
            :beatFlash="beatFlash"
            :isPlaying="isPlaying"
            :isOnPitch="isOnPitchForScore"
            :isHitEffectsEnabled="isHitEffectsEnabled"
            :isScrollable="canScrollLane"
            :scrollMaxMs="laneScrollMaxMs"
            @blockPress="playKey"
            @scrollTo="game.scrollLaneTo"
          />
        </template>
      </PianoDisplay>
    </div>
  </div>
</template>

<style scoped lang="css">
.toggle-sequence-idle {
  padding-block: 0;
  font-size: 1.2rem;
}
</style>

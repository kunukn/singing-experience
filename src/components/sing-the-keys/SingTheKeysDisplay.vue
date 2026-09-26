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
import { songMidiRange } from './singTheKeysTimeline'
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
  /* The one microphone source: scoring and the sung-pitch line both read it.
   * The real page passes usePitchDetection; the test page passes a simulated
   * detector, so this component never opens a mic itself. */
  detection: PitchDetectionInput
  titleSuffix?: string
}

const props = defineProps<Props>()

const songId = defineModel<SongId>('songId', { required: true })
const startOffset = defineModel<number>('startOffset', { required: true })
const speed = defineModel<SpeedOption>('speed', { required: true })
const isMelodyGuideEnabled = defineModel<boolean>('isMelodyGuideEnabled', {
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

const {
  reachedThreshold,
  reset: resetScore,
  onPitchRatio,
  correctNoteIndices,
} = useDwellSingScore({
  isPlaying,
  isOnPitch: isOnPitchForScore,
  activeNoteIndex,
  noteDurationsMs,
})

const scorePercent = computed(() => Math.round(onPitchRatio.value * 100))

/* Green blocks live while singing and on the result screen; none while idle
 * so a stale map never sits over a re-laid tune. */
const resultNoteIndices = computed(() =>
  showResult.value || isPlaying.value ? correctNoteIndices.value : [],
)

const isTargetCorrect = computed(
  () =>
    activeNoteIndex.value !== null &&
    correctNoteIndices.value.includes(activeNoteIndex.value),
)

/* Continuous MIDI of the singer's live pitch for the lane and key-track lines;
 * null when nothing clean is detected. */
const sungMidi = computed(() => {
  if (!isListening.value || !isClean.value || frequency.value === null)
    return null

  return frequencyToMidi(frequency.value)
})

/* One lane through the keyboard's own preview pipeline — the dashed line and
 * note chip on the keys, same as the piano page's single-voice mode. */
const previewLanes = computed<Array<DuetLane & { laneId: PianoPreviewLaneId }>>(
  () => {
    const info = noteInfo.value
    const isVisible = sungMidi.value !== null && info !== null

    return [
      {
        previewMidi: isVisible ? info.midiNote : null,
        previewFrequency: isVisible ? frequency.value : null,
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

/* Open the mic first so a permission prompt never eats the count-in, then
 * launch the timeline. */
async function startSinging() {
  showResult.value = false
  resetScore()
  await start()
  if (!isListening.value) return

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

const { fireConfetti } = useConfettiStore()

/* Reveal the result on a natural finish (never a manual stop) and celebrate
 * when enough notes were correct. */
watch(isDone, (done) => {
  if (!done) return

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

    <EdgeFadeScroller
      class="flex min-w-50 items-baseline justify-center-safe gap-2 pb-2"
    >
      <PrimeButton
        v-if="isPlaying"
        severity="danger"
        size="small"
        rounded
        class="min-w-20"
        @click="stopSinging"
      >
        {{ t('generic.stop') }}
      </PrimeButton>

      <PrimeButton
        v-else
        class="min-w-20"
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
            :elapsedMs="elapsedMs"
            :activeNoteIndex="activeNoteIndex"
            :correctNoteIndices="resultNoteIndices"
            :accidentalStyle="accidentalStyle"
            :sungMidi="sungMidi"
            :sungFrequency="frequency"
          />
        </template>
      </PianoDisplay>
    </div>
  </div>
</template>

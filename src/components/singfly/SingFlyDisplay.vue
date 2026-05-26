<script setup lang="ts">
import { VOICE_RANGES } from '@/constants/voiceRanges'
import type { NoteInfo } from '@/utils/noteUtils'
import SingFlyCanvas from './SingFlyCanvas.vue'
import SingFlyCompletePanel from './SingFlyCompletePanel.vue'
import SingFlyIdlePanel from './SingFlyIdlePanel.vue'
import SingFlyPlayingPanel from './SingFlyPlayingPanel.vue'
import { DIFFICULTY_GAP_HALF_SEMITONES } from './singFlyConstants'
import type { Difficulty } from './singFlyOptions'
import { useBirdMotion } from './useBirdMotion'
import { useCheatPitchDetection } from './useCheatPitchDetection'
import { useDetectedTonesLog } from './useDetectedTonesLog'
import { useSingFly } from './useSingFly'
import { useStablePitch } from './useStablePitch'

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
  detection: PitchDetectionInput
  simulateIdlePreview?: boolean
  /* When true, the game runs in manual-clock mode — no RAF auto-tick and the
   * canvas renders against a virtual "now" derived from elapsedMs. Used by
   * the test page so its scrub slider can drive everything deterministically. */
  manualClock?: boolean
  /* Test-page only: render the bird/pipe collision hitboxes on the canvas. */
  showHitboxes?: boolean
  /* Debug input mode: replace the mic with on-screen tone buttons on the
   * pickup line. Holding a button sings that note; releasing is silence. The
   * microphone is never touched in this mode. */
  cheatButtons?: boolean
  /* Test-page only: always render the orange preview line at the live
   * (stabilized) detected pitch in every phase, ignoring the normal
   * idle/crashed gating + crash delay, so the accurate pitch line can be
   * eyeballed against the bird/hitboxes while playing or scrubbing. */
  forcePreviewLine?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  simulateIdlePreview: false,
  manualClock: false,
  showHitboxes: false,
  cheatButtons: false,
  forcePreviewLine: false,
})

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const gameDurationSec = defineModel<number>('gameDurationSec', {
  required: true,
})
const difficulty = defineModel<Difficulty>('difficulty', { required: true })

const { t } = useI18n()
const isRtl = useIsRtl()

const { setToneMode } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
setToneMode(storedToneMode.value)

/* Cheat-button mode swaps the real/simulated detection for a mic-free synthetic
 * source driven by the on-screen tone buttons. cheatButtons is a static mode
 * prop, so selecting the source once is safe. */
const cheat = useCheatPitchDetection()
const activeDetection = props.cheatButtons ? cheat : props.detection

const { noteInfo, isListening, isClean, error, start, stop } = activeDetection

/* Two-stage pitch conditioning before it drives the bird and the game logic:
 *  1. useStablePitch de-flickers the raw pitch — isolated octave/fifth spikes
 *     are filtered so they neither jerk the bird nor randomly hit pillars;
 *  2. useBirdMotion eases the bird toward the sung note (fast, never
 *     teleporting) and HOLDS its last position on silence — pure tone→height,
 *     no gravity/fall.
 * smoothNoteInfo is the single source feeding BOTH the game logic and the
 * canvas bird, so "what you see is what you hit" holds. useBirdMotion mutates
 * it and needs the game clock/state, so it is declared here and created AFTER
 * useSingFly (which reads it) — breaking the otherwise-circular order.
 * useStablePitch itself is created below, once the voice-range refs it gates
 * on (gameMidiMin/Max, gapHalfSemitones) exist. */
const smoothNoteInfo = ref<NoteInfo | null>(null)

const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

const { isPreviewEnabled } = useSettings()

const gameMidiMin = computed(() => selectedRange.value.midiMin)
const gameMidiMax = computed(() => selectedRange.value.midiMax)
const gameDurationMs = computed(() => gameDurationSec.value * 1000)

/* Active difficulty's gap half-width — drives the drawn gap; the game logic
 * snapshots the same record at startGame so scoring/collision stay in sync.
 * Reactive so the idle preview gap resizes when the difficulty changes. */
const gapHalfSemitones = computed(
  () => DIFFICULTY_GAP_HALF_SEMITONES[difficulty.value],
)

/* Stage 1 of the conditioning (see the block comment above). Range-gated so a
 * breath/decay slide the detector mistakes for a fast descent is treated as
 * silence instead of dragging the bird out of range. */
const { stableNoteInfo } = useStablePitch({
  noteInfo,
  isClean,
  midiMin: gameMidiMin,
  midiMax: gameMidiMax,
  gapHalfSemitones,
})

const { fireConfetti } = useConfettiStore()

const manualClock = toRef(props, 'manualClock')

/* Live canvas CSS size, reported by SingFlyCanvas. The game logic runs
 * pixel collision against these exact dimensions so "what you see is what you
 * hit" holds at any responsive width. */
const canvasSize = ref({ width: 0, height: 0 })
const canvasWidth = computed(() => canvasSize.value.width)
const canvasHeight = computed(() => canvasSize.value.height)

const {
  targets,
  score,
  summary,
  phase,
  crashCause,
  isIdle,
  isPlaying,
  isEnded,
  gameState,
  elapsedMs,
  gameStartTime,
  startGame,
  stopGame,
  reset: resetGame,
  setElapsedMs,
} = useSingFly({
  noteInfo: smoothNoteInfo,
  isClean,
  midiMin: gameMidiMin,
  midiMax: gameMidiMax,
  voiceRange: selectedRange,
  gameDurationMs,
  difficulty,
  canvasWidth,
  canvasHeight,
  isRtl,
  manualClock,
})

/* Mic lifecycle, owned in one place keyed off the machine phase + the preview
 * toggle (replaces the old onEnd closure + diedByCrash scan). Ended (crashed or
 * won) + preview on: keep the detection alive so the post-game orange pitch
 * line stays live (the frozen bird reads retained smoothNoteInfo, so it does
 * not move). Preview off: release the mic. Idle is handled by
 * handleReset/useIdlePreview, so no idle branch here — avoids a stop()/start()
 * race with the reset→start path. */
watch(phase, (name) => {
  if (name === 'crashed' || name === 'won') {
    if (!isPreviewEnabled.value) stop()
  }
})

/* Toggling preview while the complete panel is up mirrors the idle screen:
 * acquire/release the mic so the orange line responds to the button there too.
 * Gated on isEnded so it never interferes with idle (useIdlePreview owns that)
 * or playing. Permission was already granted to play, so start() never
 * re-prompts; both start()/stop() are idempotent. */
watch(isPreviewEnabled, async (enabled) => {
  if (!isEnded.value) return

  if (enabled) {
    await start()
  } else {
    stop()
  }
})

/* The bird's neutral height before Start and at round start, until the
 * singer's first note moves it (no gravity — silence holds, never falls):
 * the midpoint of the selected range, so it starts centered between the
 * lowest and highest note. When the span is odd and has no exact middle
 * semitone, Math.round biases up — 1 semitone above the middle. */
const perchMidi = computed(() =>
  Math.round((selectedRange.value.midiMin + selectedRange.value.midiMax) / 2),
)
const isGamePlaying = computed(() => phase.value === 'playing')

useBirdMotion({
  noteInfo: stableNoteInfo,
  smoothNoteInfo,
  isPlaying: isGamePlaying,
  perchMidi,
  manualClock,
  gameStartTime,
  elapsedMs,
})

/* Debug-only: log every new tone produced during a round on three channels
 * (raw / stable / smooth) for after-the-fact comparison. No-op unless
 * VITE_DEBUG_LOG=1. Arrays exposed below for devtools/test-page inspection. */
const { rawTones, stableTones, smoothTones } = useDetectedTonesLog({
  rawNoteInfo: noteInfo,
  stableNoteInfo,
  smoothNoteInfo,
  isPlaying: isGamePlaying,
  elapsedMs,
})

/* In manual-clock mode, freeze the canvas time at gameStartTime + elapsedMs
 * so pipes only move when the driver advances elapsedMs (i.e. when the test
 * page scrubs). */
const canvasNowOverride = computed(() =>
  props.manualClock && gameStartTime.value !== null
    ? gameStartTime.value + elapsedMs.value
    : null,
)

const isGameActive = computed(() => !isIdle.value)

/* Singfly is all-or-nothing: 'won' already means every pipe was scored
 * (the machine only enters it on a clean run), so confetti fires on entry. */
watch(phase, (name) => {
  if (name === 'won') fireConfetti()
})

/* `isPreviewEnabled` (raw localStorage ref) is the user-facing preview toggle.
 * It deliberately serves two roles, only ONE of which can reach the mic:
 *   - real mode: gates useIdlePreview, which may open the microphone — so it
 *     is funnelled through `idlePreviewEnabled` below, forced false in
 *     simulated mode so shouldListen never flips true and requestPermission()
 *     is never called (no microphone is ever touched on the test page);
 *   - simulated mode: the raw ref is read directly (in the panel toggle and
 *     the chart-pitch branches) only to gate the *simulated* detection — that
 *     path never touches the microphone, so using the raw ref there is safe
 *     and intentional, not a leak. Do NOT pass `idlePreviewEnabled` to the
 *     idle panel: it is always false in simulated mode and would dead-lock
 *     the test page's preview toggle. */
const idlePreviewEnabled = computed({
  get: () =>
    props.simulateIdlePreview || props.cheatButtons
      ? false
      : isPreviewEnabled.value,
  set: (value) => {
    if (!props.simulateIdlePreview && !props.cheatButtons)
      isPreviewEnabled.value = value
  },
})

const {
  previewMidi,
  micPermission,
  rawNoteInfo: idleRawNoteInfo,
  rawIsClean: idleRawIsClean,
} = useIdlePreview({
  isGameActive,
  isEnabled: idlePreviewEnabled,
})

/* Stabilize the real-mic idle preview the same way the playing path is
 * stabilized — so keyboard bangs and detector flukes don't yank the bird
 * while the user is on the idle screen. previewMidi still acts as the
 * null-gate (deaf period, preview disabled), but the stable value is used
 * for the actual bird position. */
const { stableNoteInfo: stableIdleNoteInfo } = useStablePitch({
  noteInfo: idleRawNoteInfo,
  isClean: idleRawIsClean,
  midiMin: gameMidiMin,
  midiMax: gameMidiMax,
  gapHalfSemitones,
})

const panelMicPermission = computed<PermissionState | null>(() =>
  props.simulateIdlePreview ? 'granted' : micPermission.value,
)

/* Single source-selection for the chart bird's pitch. midi/frequency always
 * travel together so the branching lives once; chartCurrentMidi/Frequency are
 * thin projections. null means "no pitch" → the canvas draws the bird on the
 * perch board instead, so the bird is never invisible. Sources by state:
 *   - playing: the pitch bird (always present — easing toward the sung note,
 *     or holding its last position on silence);
 *   - complete: the pitch bird's retained final value, so the crashed bird
 *     stays on screen at its collision point;
 *   - idle, cheat/simulate: the live stabilized pitch so the cheat buttons /
 *     simulated singer still move the bird before Start (gated by the visible
 *     preview toggle in simulate mode — never the microphone);
 *   - idle (real): stabilized idle-preview pitch, gated by previewMidi's
 *     deaf-period / enabled checks so those null-gates still apply. */
type ChartPitch = { midi: number | null; frequency: number | null }

const chartPitch = computed<ChartPitch>(() => {
  if (isPlaying.value || isEnded.value) {
    const info = smoothNoteInfo.value
    return { midi: info?.midiNote ?? null, frequency: info?.frequency ?? null }
  }
  if (props.cheatButtons) {
    /* Mic-free: the bird only ever follows the synthetic cheat pitch, never
     * the mic idle-preview branch. */
    const info = stableNoteInfo.value
    return { midi: info?.midiNote ?? null, frequency: info?.frequency ?? null }
  }
  if (props.simulateIdlePreview) {
    const info = isPreviewEnabled.value ? stableNoteInfo.value : null
    return { midi: info?.midiNote ?? null, frequency: info?.frequency ?? null }
  }

  /* Real-mic idle: gate on previewMidi (deaf period / preview disabled → null),
   * but use the stabilized value for the actual bird position so flukes don't
   * yank the bird. */
  if (previewMidi.value === null) return { midi: null, frequency: null }
  const stableInfo = stableIdleNoteInfo.value
  return {
    midi: stableInfo?.midiNote ?? null,
    frequency: stableInfo?.frequency ?? null,
  }
})
const chartCurrentMidi = computed(() => chartPitch.value.midi)
const chartCurrentFrequency = computed(() => chartPitch.value.frequency)

/* Pre-motion (de-flickered) pitch for the bird label only: while playing, when
 * the bird is frozen out of range the canvas labels this instead of the
 * motion-smoothed value, so the real sung note shows instantly. Null when not
 * playing → the canvas falls back to the bird's own pitch (idle/completion
 * frame unchanged). */
const chartRawMidi = computed(() =>
  isPlaying.value ? (stableNoteInfo.value?.midiNote ?? null) : null,
)

/* Live sung pitch driving the orange preview line. Two cases:
 *  - ended (crashed or won) + preview on: the kept-alive activeDetection (real
 *    mic / simulated / cheat) keeps stableNoteInfo updating — "what you should
 *    have sung". Deliberately separate from the bird so the frozen end bird
 *    stays put (the canvas additionally delays the line CRASH_PREVIEW_DELAY_MS).
 *  - idle with a pitch: reuse chartPitch — the exact idle-preview pitch the
 *    bird already follows (real / cheat / simulate), so the line and bird
 *    coincide and it works in every mode. A steady-pitch reference while
 *    warming up. Null otherwise (playing, preview off, nothing sung). */
const previewLinePitch = computed<ChartPitch>(() => {
  /* Test page: track the live stabilized (mic-free) pitch in every phase so
   * the accurate line is always inspectable next to the bird/hitboxes. */
  if (props.forcePreviewLine) {
    const info = stableNoteInfo.value
    return { midi: info?.midiNote ?? null, frequency: info?.frequency ?? null }
  }
  if (isEnded.value && isPreviewEnabled.value) {
    const info = stableNoteInfo.value
    return { midi: info?.midiNote ?? null, frequency: info?.frequency ?? null }
  }
  if (phase.value === 'idle' && chartPitch.value.midi != null) {
    return chartPitch.value
  }

  return { midi: null, frequency: null }
})

/* Clamp to the picked duration so a winning run reads "10.0s / 10s", never
 * "10.2s / 10s" from pipe jitter or the rare end-timer over-run. */
const elapsedSeconds = computed(() =>
  (Math.min(elapsedMs.value, gameDurationMs.value) / 1000).toFixed(1),
)

async function handleStart() {
  resetGame()
  await start()
  debugLog('[SingFly] game start', {
    difficulty: difficulty.value,
    gameLengthSec: gameDurationSec.value,
    voiceRange: `${selectedRange.value.labelKey} (${selectedRange.value.noteRange})`,
    midiMin: selectedRange.value.midiMin,
    midiMax: selectedRange.value.midiMax,
  })
  startGame()
}

/* Leaving the crash frame: release any mic kept alive for the post-death
 * preview line so idle preview (its own detection) owns the idle screen with
 * no double stream. stop() is idempotent — safe after a non-crash end too. */
function handleReset() {
  stop()
  resetGame()
}

/* Cheat mode is mic-free and safe to keep live from mount, so the bird is also
 * controllable on the idle screen (the test page relies on this). start() is
 * idempotent, so handleStart's start() is harmless. */
onMounted(() => {
  if (props.cheatButtons) cheat.start()
})

onUnmounted(() => {
  stop()
})

defineExpose({
  setElapsedMs,
  gameState,
  elapsedMs,
  rawTones,
  stableTones,
  smoothTones,
})
</script>

<template>
  <div
    class="flex flex-1 flex-col items-center gap-4 pb-4"
    data-testid="singfly-display"
  >
    <div class="flex min-h-17 flex-col items-center gap-4">
      <h1 class="flex items-center gap-2 text-2xl font-semibold">
        <span>{{ t('singFly.title') }}</span>
      </h1>
      <!-- Kept mounted (v-show, not v-if) so the header block holds a stable
        height across state changes and the layout doesn't reflow. -->
      <p
        v-show="gameState !== 'complete'"
        class="text-sm text-(--p-text-muted-color)"
      >
        {{ t('singFly.subtitle') }}
      </p>
    </div>

    <div class="flex min-h-40 w-full flex-col items-center sm:min-h-60">
      <SingFlyIdlePanel
        v-if="gameState === 'idle'"
        v-model:rangeIndex="rangeIndex"
        v-model:isPreviewEnabled="isPreviewEnabled"
        v-model:gameDurationSec="gameDurationSec"
        v-model:difficulty="difficulty"
        :micPermission="panelMicPermission"
        :error="error"
        @start="handleStart"
      />

      <SingFlyPlayingPanel
        v-else-if="gameState === 'playing'"
        :score="score"
        :totalTargets="targets.length"
        :elapsedSeconds="elapsedSeconds"
        @stop="stopGame"
      />

      <!-- `&& summary` is load-bearing for the type narrowing that lets
        `:summary` accept a non-null GameSummary; it is never false at runtime
        when gameState === 'complete' (gameState derives 'complete' from
        summary !== null). -->
      <SingFlyCompletePanel
        v-else-if="gameState === 'complete' && summary"
        :summary="summary"
        :elapsedSeconds="elapsedSeconds"
        v-model:isPreviewEnabled="isPreviewEnabled"
        :micPermission="panelMicPermission"
        @reset="handleReset"
      />
    </div>

    <SingFlyCanvas
      :currentMidi="chartCurrentMidi"
      :currentFrequency="chartCurrentFrequency"
      :currentRawMidi="chartRawMidi"
      :previewLineMidi="previewLinePitch.midi"
      :previewLineFrequency="previewLinePitch.frequency"
      :alwaysShowPreviewLine="forcePreviewLine"
      :perchMidi="perchMidi"
      :isListening="isListening"
      :midiMin="selectedRange.midiMin"
      :midiMax="selectedRange.midiMax"
      :gapHalfSemitones="gapHalfSemitones"
      :targets="targets"
      :phase="phase"
      :crashCause="crashCause"
      :isRtl="isRtl"
      :showHitboxes="showHitboxes"
      :cheatButtons="cheatButtons"
      :nowOverride="canvasNowOverride"
      @resize="canvasSize = $event"
      @holdNote="cheat.holdMidi"
      @releaseNote="cheat.releaseMidi"
    />
  </div>
</template>

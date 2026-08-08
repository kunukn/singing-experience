<script setup lang="ts">
import { resolveCssColor } from '@/utils/cssColor'
import { frequencyToMidi, midiToNoteLabel } from '@/utils/noteUtils'
import { resolveEffectiveMidi } from '@/utils/pitchLineRenderer'
import {
  HISTORY_WINDOW_MS,
  TRACE_DOT_RADIUS,
  TRACE_LABEL_MIN_HOLD_MS,
  TRACE_MAX_AGE_MS,
  TRACE_SAMPLE_INTERVAL_MS,
} from './singFlyConstants'
import {
  BIRD_RADIUS,
  PADDING_BOTTOM,
  PADDING_TOP,
  buildPlayfield,
  computeGeometry,
  findCollidingTarget,
  getBirdRect,
  isBirdPositionFrozen,
  isOutOfRange,
  midiToY,
  pickupLineX,
  type ChartGeometry,
  type Playfield,
} from './singFlyGeometry'
import type { CrashCause, SingFlyPhase } from './singFlyMachine'
import type { GameTarget } from './useSingFly'

type Props = {
  /* Bird position. Same source while playing (game's pitch detector) and
   * while idle (useIdlePreview), so the renderer doesn't care which. */
  currentMidi: number | null
  currentFrequency: number | null
  /* De-flickered pre-motion pitch, used only for the bird's note label while
   * the bird is frozen out of range — so the label shows the real sung note
   * instantly even though the bird stays pinned at the band edge. */
  currentRawMidi?: number | null
  /* Live sung pitch driving the DoReMi-style orange preview line. Shown on
   * the crash frame (after CRASH_PREVIEW_DELAY_MS, so it doesn't pop in
   * mid-death) so the player can re-sing against the frozen killer pipe's
   * gap, and on the idle screen when "preview my voice" is on (a steady-pitch
   * reference while warming up). Independent of currentMidi so the crashed
   * bird stays frozen. Null = no line. */
  previewLineMidi?: number | null
  previewLineFrequency?: number | null
  /* Test-page only: draw the preview line in every phase with no crash
   * delay (normally it's idle / delayed-crashed only), so the pitch-true
   * line can be eyeballed against the bird/hitboxes while playing/scrubbing. */
  alwaysShowPreviewLine?: boolean
  /* Where the bird perches when there is no pitch (idle screen with preview
   * off): the bird is drawn here instead of being hidden, so it is never
   * invisible. Also the Y for the idle perch board. */
  perchMidi: number
  isListening: boolean
  midiMin: number
  midiMax: number
  /* Half-height of the pipe gap in semitones for the active difficulty. The
   * canvas draws the gap this wide and the game logic scores/crashes against
   * the same number — one source of truth. */
  gapHalfSemitones: number
  targets: GameTarget[]
  /* The single round-lifecycle source of truth (machine phase). Drives the
   * canvas freeze / death burst / preview-line gating in one watcher. */
  phase: SingFlyPhase
  /* Why the round ended (machine context). The boundary side recolors the
   * lethal floor/ceiling rect the same red a crashed pillar gets; null while
   * playing or on a clean win / incomplete. */
  crashCause?: CrashCause | null
  isRtl?: boolean
  /* Test-page only: stroke the bird's hitbox square and every pending pipe's
   * top/bottom rectangles so collisions can be eyeballed. Rects involved in a
   * live overlap are recolored. */
  showHitboxes?: boolean
  /* When provided, used as the canvas "now" in place of performance.now().
   * Enables the test page to drive pipe positions deterministically from a
   * scrub slider. */
  nowOverride?: number | null
  /* Debug input mode: overlay a clickable tone button per semitone on the
   * pickup line. Holding a button emits holdNote; releasing emits releaseNote. */
  cheatButtons?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showHitboxes: false,
  nowOverride: null,
  currentRawMidi: null,
  previewLineMidi: null,
  previewLineFrequency: null,
  alwaysShowPreviewLine: false,
  cheatButtons: false,
  crashCause: null,
})

/* Derived boundary side for the wall recolor, replacing the old boundaryCrash
 * prop. buildPlayfield still takes a 'floor'|'ceiling'|null, so this is a thin
 * projection of the machine's crash cause. */
const boundaryCrash = computed<'floor' | 'ceiling' | null>(() =>
  props.crashCause?.kind === 'boundary' ? props.crashCause.side : null,
)

/* resize: canvas CSS size, so the game logic runs pixel collision against the
 * exact dimensions drawn here. holdNote/releaseNote: cheat-button press/release
 * (the MIDI note pressed; release carries none). */
const emit = defineEmits<{
  resize: [{ width: number; height: number }]
  holdNote: [midi: number]
  releaseNote: []
}>()

/* px between the label axis and the low/high range marker text. */
const RANGE_LABEL_GUTTER_GAP = 6
/* Muted — the range markers are a quiet reference, not a focal element. */
const RANGE_LABEL_ALPHA = 0.55

/* The one green-pillar fill, shared by the moving pipes and the static
 * ceiling/floor wall. Opaque on purpose: every solid rect this frame (wall band
 * + pillar columns) is unioned into ONE Path2D and filled once, so overlaps
 * merge with no compounded-alpha seam and draw order is irrelevant — pillar +
 * wall read as one continuous solid obstacle. No stroke: a rim on a unioned
 * path would re-draw the very pillar/wall seam the union removes. */
const PENDING_PIPE_FILL = 'rgb(34, 197, 94)'

/* The one "this is what killed you" red, shared by the crashed pillar and the
 * lethal floor/ceiling wall — same palette so a pillar death and a boundary
 * death read identically. Overlaid on the green fill, so a crashed pillar stays
 * red through the wall band too. */
const CRASHED_FILL = 'rgb(239, 68, 68)'

/* The orange preview pitch line — mirrors --p-orange-400, the exact color
 * DoReMiScaleItem's preview line uses. A literal rgb per this file's
 * canvas-alpha convention (see the trace-dot note): a --p-* var can't carry
 * the per-element alpha. Out-of-range pitches reuse CRASHED_FILL red, matching
 * DoReMi's red out-of-range styling. */
const PREVIEW_LINE_COLOR = 'rgb(251, 146, 60)'

/* Hold the preview line back this long after a crash so it doesn't pop in
 * while the player is still mid-death (the ≤900ms death burst finishes first).
 * 1–2s is the intent; the exact value isn't critical. */
const CRASH_PREVIEW_DELAY_MS = 1200

/* --- Death / collision impact effect ---
 * A transient overlay played over the frozen crash frame, then it settles back
 * to the static bird (the bird is intentionally kept so the player still sees
 * which pipe killed them and how off-pitch they were). */
const DEATH_DURATION_MS = 900 // total overlay lifetime
const DEATH_FLASH_MS = 150 // white impact flash fade-out window
const DEATH_SHAKE_MS = 250 // screen-shake decay window
const DEATH_RING_MS = 450 // shockwave ring expand + fade window
const DEATH_RING_MAX_PX = 60 // shockwave ring final radius
const DEATH_PARTICLE_COUNT = 7 // feather shards
const DEATH_GRAVITY_PX_S2 = 1400 // px/s² downward pull on shards
const DEATH_SPEED_MIN_PX_S = 90 // shard initial speed range (px/s)
const DEATH_SPEED_MAX_PX_S = 170
const DEATH_SHAKE_MAX_PX = 6 // peak shake amplitude
/* Reduced-motion path: no shake, no shards — just a short gentle flash + ring. */
const DEATH_DURATION_REDUCED_MS = 450

type DeathParticle = {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  spin: number // rad/s
  color: string
}

type DeathAnim = {
  startTime: number
  durationMs: number
  reduced: boolean
  anchor: { x: number; y: number } | null
  particles: DeathParticle[]
}

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animationFrameId: number | null = null
let resizeObserver: ResizeObserver | null = null
let pausedAt: number | null = null
/* Wall-clock time the round entered 'crashed' (NOT the frozen canvas `now`),
 * so the preview line can be delayed CRASH_PREVIEW_DELAY_MS past the death. */
let crashStartedAt: number | null = null

/* Last bird center drawn this frame — the death effect anchors here so the
 * burst starts exactly where the bird was, with no recomputation drift. */
let lastBird = { x: 0, y: 0, visible: false }

/* Flight-path trace: a rolling buffer of (canvas-time, sung MIDI) sampled
 * every TRACE_SAMPLE_INTERVAL_MS while playing. Each dot spawns at the pickup
 * line and scrolls left with the field, so the trail stays glued to the pipes
 * the bird flew through. Reset per round; kept frozen on the crash frame. */
let traceSamples: { time: number; midi: number }[] = []
let lastTraceSampleTime = 0

/* Debug snapshot cadence — one game-state dump per second (no-op unless
 * VITE_DEBUG_LOG=1). Diagnostic only; not user-facing. */
const SNAPSHOT_LOG_INTERVAL_MS = 1000
let lastSnapshotLogTime = 0

/* Sustained-note labels: one per held note, anchored at its onset so it rides
 * the trace with that note's dots. Keyed on the actually-detected sung pitch
 * (props.currentRawMidi, null on silence) — NOT the held bird position — so a
 * silence-hold never stamps a label. */
let traceLabels: { time: number; midi: number; label: string }[] = []
let sustainedMidi: number | null = null
let sustainedStartTime = 0
let sustainedLabelEmitted = false

let deathAnim: DeathAnim | null = null
let deathTriggeredThisRound = false
let deathFrameId: number | null = null

const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)',
).matches

/* Live bird MIDI: prefer fractional MIDI derived from Hz for sub-semitone
 * precision; fall back to the integer currentMidi when only that's available.
 * Same source the collision logic reads, so the drawn bird and its hitbox
 * agree. */
function liveBirdMidi(): number | null {
  if (props.currentFrequency != null && props.currentFrequency > 0) {
    return frequencyToMidi(props.currentFrequency)
  }

  return props.currentMidi
}

function rectPath(
  rects: { x: number; y: number; width: number; height: number }[],
): Path2D {
  const path = new Path2D()
  for (const rect of rects) {
    path.rect(rect.x, rect.y, rect.width, rect.height)
  }

  return path
}

/* The whole solid field — ceiling, floor and every drawn pillar column —
 * filled as ONE unioned Path2D so overlaps merge with no seam and draw order
 * is irrelevant (no more drawPipes-then-drawBoundary ordering). The crashed
 * subset is overlaid in the danger color on top, so the crashed pillar / lethal
 * side stays red through the wall band. Note labels sit centered in each gap.
 * The pillar/wall span comes from buildPlayfield's single drawn-pillar source,
 * so they can never disagree. */
function drawPlayfield(ctx: CanvasRenderingContext2D, field: Playfield) {
  ctx.fillStyle = PENDING_PIPE_FILL
  ctx.fill(rectPath(field.solids))

  if (field.crashed.length > 0) {
    ctx.fillStyle = CRASHED_FILL
    ctx.fill(rectPath(field.crashed))
  }

  ctx.save()
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  /* Theme-adaptive so the gap label stays readable on --p-content-background in
   * both light and dark mode (it sits at the gap center, never on a green
   * pillar). Same helper + a 0.85 mute the range labels use, keeping light-mode
   * appearance unchanged while a touch more prominent than the quieter
   * RANGE_LABEL_ALPHA markers since this is the scoring target. */
  ctx.globalAlpha = 0.85
  ctx.fillStyle = resolveCssColor('--p-text-color')
  for (const pipe of field.pipes) {
    ctx.fillText(midiToNoteLabel(pipe.midi).label, pipe.centerX, pipe.gapY)
  }
  ctx.restore()
}

/* Static low/high markers for the selected voice range. Anchored at the true
 * range-boundary Y (midiToY already applies the difficulty's range pad, so the
 * high marker sits just below the top edge and the low marker just above the
 * bottom edge — exactly where an edge pipe of that note passes). Drawn in the
 * label
 * gutter so it never competes with the bird (far-right pickup line). */
function drawRangeLabels(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  const highLabel = midiToNoteLabel(props.midiMax).label
  const lowLabel = midiToNoteLabel(props.midiMin).label
  const highY = midiToY(
    props.midiMax,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )
  const lowY = midiToY(
    props.midiMin,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )

  const x = props.isRtl
    ? geom.labelAxisX + RANGE_LABEL_GUTTER_GAP
    : geom.labelAxisX - RANGE_LABEL_GUTTER_GAP

  ctx.save()
  ctx.globalAlpha = RANGE_LABEL_ALPHA
  ctx.fillStyle = resolveCssColor('--p-text-color')
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = props.isRtl ? 'start' : 'end'
  ctx.textBaseline = 'middle'
  ctx.fillText(highLabel, x, highY)
  ctx.fillText(lowLabel, x, lowY)
  ctx.restore()
}

/* Horizontal range-edge cues at the C3/C4 marker pitches. Same dashed slate as
 * the vertical pickup line so they read as one quiet reference family. Spans the
 * chart play area; drawn before the green fill so pipes/walls paint over it. The
 * Ys reuse the exact midiToY expressions drawRangeLabels uses, so each line is
 * vertically centered on its gutter label. */
function drawRangeLines(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  const highY = midiToY(
    props.midiMax,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )
  const lowY = midiToY(
    props.midiMin,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )

  ctx.save()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  ctx.moveTo(geom.chartLeftX, highY)
  ctx.lineTo(geom.chartRightX, highY)
  ctx.moveTo(geom.chartLeftX, lowY)
  ctx.lineTo(geom.chartRightX, lowY)
  ctx.stroke()
  ctx.restore()
}

/* The launch platform the bird perches on before Start. Drawn only in idle —
 * once the round begins the bird flies off it as soon as the singer's first
 * note moves it. Centered on the pickup line at the perch note's Y, sized so
 * the bird circle rests on its top edge. */
const PERCH_BOARD_HALF_WIDTH = BIRD_RADIUS + 6
const PERCH_BOARD_HEIGHT = 4

function drawPerchBoard(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  const rect = getBirdRect(
    props.perchMidi,
    geom,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )
  const centerX = rect.x + rect.width / 2
  const birdBottomY = rect.y + rect.height / 2 + BIRD_RADIUS
  const boardX = centerX - PERCH_BOARD_HALF_WIDTH

  ctx.save()
  ctx.fillStyle = resolveCssColor('--p-surface-400', 'rgb(148, 163, 184)')
  ctx.beginPath()
  ctx.roundRect(
    boardX,
    birdBottomY,
    PERCH_BOARD_HALF_WIDTH * 2,
    PERCH_BOARD_HEIGHT,
    2,
  )
  ctx.fill()
  ctx.restore()
}

/* The bird's flown path: faint dots, each placed by its age so it spawns at
 * the pickup line (where the bird is "now") and scrolls left toward the label
 * axis at the field's exact px/ms rate — staying aligned with the pipes it
 * passed. Y reuses getBirdRect so a dot sits on the exact pixel the bird was
 * drawn at (same band/chart clamp). Drawn under the pipes and bird. */
function drawTrace(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
  now: number,
) {
  const pickupX = pickupLineX(geom)
  /* px/ms the field scrolls (negative toward the label axis); same span
   * timeToX uses, so a dot tracks the pipe it was beside. */
  const scrollPerMs = (geom.labelAxisX - geom.nowEdgeX) / HISTORY_WINDOW_MS

  for (const sample of traceSamples) {
    const age = now - sample.time
    /* Skip not-yet-due / fully-exited samples — also guards a backward scrub
     * on the manual-clock test page. */
    if (age < 0 || age > TRACE_MAX_AGE_MS) continue

    const x = pickupX + scrollPerMs * age
    const rect = getBirdRect(
      sample.midi,
      geom,
      height,
      props.midiMin,
      props.midiMax,
      props.gapHalfSemitones,
    )
    const y = rect.y + rect.height / 2
    /* Fade with age; 0.2 floor keeps the oldest dots faintly readable. */
    const opacity = Math.max(0.2, 1 - age / TRACE_MAX_AGE_MS)

    ctx.beginPath()
    ctx.arc(x, y, TRACE_DOT_RADIUS, 0, Math.PI * 2)
    /* Same muted slate as the pickup line — a quiet reference, not a focal
     * element. A literal rgba (not a --p-* var) so the per-dot alpha fade
     * works; matches the existing canvas convention (pickup line / bird). */
    ctx.fillStyle = `rgba(148, 163, 184, ${opacity})`
    ctx.fill()
  }

  /* Sustained-note labels: ride the trace, anchored at the note's onset.
   * Y uses midiToY(entry.midi) — the EXACT same mapping (and integer note)
   * the matching pipe's gap/label uses (getPipeRects' gapY), with a 'middle'
   * baseline, so a clean note's trace label lines up horizontally with that
   * note's pipe gap: the player can see whether their sustained pitch sat
   * where the pipe wanted it. It therefore sits on its own trail dots; text
   * is darker than the faint dots so it stays readable. Theme-adaptive so it
   * reads on --p-content-background in light/dark; higher opacity floor than
   * the dots since text needs to stay legible. */
  if (traceLabels.length > 0) {
    const textColor = resolveCssColor('--p-text-color')
    ctx.save()
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const entry of traceLabels) {
      const age = now - entry.time
      if (age < 0 || age > TRACE_MAX_AGE_MS) continue

      const x = pickupX + scrollPerMs * age
      const y = midiToY(
        entry.midi,
        height,
        props.midiMin,
        props.midiMax,
        props.gapHalfSemitones,
      )
      const opacity = Math.max(0.35, 1 - age / TRACE_MAX_AGE_MS)

      ctx.globalAlpha = opacity
      ctx.fillStyle = textColor
      ctx.fillText(entry.label, x, y)
    }
    ctx.restore()
  }
}

function drawBird(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  /* No pitch (idle screen, preview off) → the bird perches on the board
   * instead of vanishing. The bird is ALWAYS visible and ALWAYS solid. */
  const birdMidi = liveBirdMidi() ?? props.perchMidi

  /* getBirdRect applies the same chart-area clamp the bird used to do inline,
   * so the drawn circle and the collision square share one center. */
  const rect = getBirdRect(
    birdMidi,
    geom,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )
  const x = rect.x + rect.width / 2
  const y = rect.y + rect.height / 2

  const alpha = 1
  ctx.fillStyle = `rgba(251, 191, 36, ${alpha})`
  ctx.strokeStyle = `rgba(180, 83, 9, ${alpha})`
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.arc(x, y, BIRD_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  /* Tiny eye + beak for a touch of personality. */
  ctx.fillStyle = `rgba(15, 23, 42, ${alpha})`
  ctx.beginPath()
  ctx.arc(x + 3, y - 2, 1.5, 0, Math.PI * 2)
  ctx.fill()

  const beakSign = props.isRtl ? -1 : 1
  const isCrashed = props.phase === 'crashed'
  ctx.fillStyle = isCrashed
    ? `rgba(180, 83, 9, ${alpha})` // burnt amber — bird's own border color; visible against red
    : `rgba(234, 88, 12, ${alpha})`
  ctx.beginPath()
  ctx.moveTo(x + beakSign * (BIRD_RADIUS + 5), y) // tip points outward
  ctx.lineTo(x + beakSign * BIRD_RADIUS, y - 2) // base flush to body
  ctx.lineTo(x + beakSign * BIRD_RADIUS, y + 2)
  ctx.closePath()
  ctx.fill()

  /* Note label on the side opposite the beak — sits in the empty space
   * behind the bird, away from incoming pipes. While the bird is frozen at the
   * band edge (pitch >RANGE_PAD out of range), label the real pre-smoothing
   * note so the player still sees what they're singing (e.g. A2) even though
   * the bird stays pinned; otherwise label the bird's own (smoothed) pitch. */
  const frozen = isBirdPositionFrozen(
    birdMidi,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )
  const labelMidi =
    frozen && props.currentRawMidi != null ? props.currentRawMidi : birdMidi
  const roundedMidi = Math.round(labelMidi)
  const label = midiToNoteLabel(roundedMidi).label
  const isOutOfRange =
    roundedMidi < props.midiMin || roundedMidi > props.midiMax
  /* Orange when the pitch is outside the selected voice range — signals the
   * note can't score against any pipe. Matches the beak color for palette
   * consistency. In range: theme-adaptive --p-text-color so the label stays
   * readable on --p-content-background in both light and dark mode (it sits
   * beside the bird on the background, not on the amber body). */
  const labelColor = isOutOfRange
    ? `rgba(234, 88, 12, ${alpha})`
    : resolveCssColor('--p-text-color')
  const LABEL_GAP = 6 // px between bird edge and label
  /* When out of range, nudge the label further past the chart edge it's
   * exceeding — reinforces "out of range" by pulling the label outside the
   * normal range band. */
  const OUT_OF_RANGE_LABEL_NUDGE = 4
  const outOfRangeOffset = !isOutOfRange
    ? 0
    : roundedMidi > props.midiMax
      ? -OUT_OF_RANGE_LABEL_NUDGE
      : OUT_OF_RANGE_LABEL_NUDGE
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = props.isRtl ? 'start' : 'end'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = labelColor
  const labelX = x + -beakSign * (BIRD_RADIUS + LABEL_GAP)
  /* Nudge label down to optically center against the bird body. */
  ctx.fillText(label, labelX, y + 1 + outOfRangeOffset)

  /* Anchor the death burst at the drawn bird center, so shards spray from
   * where the player last saw it. */
  lastBird = { x, y, visible: true }
}

/* Test-page collision visualizer: draws the exact rectangles the game logic
 * collides against, so on/off-pitch passes are unambiguous. Uses the same
 * findCollidingTarget the game logic uses, so the highlighted overlap is the
 * real one. */
function drawHitboxes(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  width: number,
  height: number,
  now: number,
  field: Playfield,
) {
  if (!props.showHitboxes) return

  const birdMidi = liveBirdMidi()
  const collidingId = findCollidingTarget({
    targets: props.targets,
    birdMidi,
    now,
    width,
    height,
    isRtl: props.isRtl ?? false,
    midiMin: props.midiMin,
    midiMax: props.midiMax,
    gapHalfSemitones: props.gapHalfSemitones,
  })

  const dangerColor = resolveCssColor('--p-red-500', 'rgb(239, 68, 68)')
  const mutedColor = resolveCssColor('--p-surface-400', 'rgb(148, 163, 184)')
  const birdBoxColor = resolveCssColor('--p-primary-color', 'rgb(59, 130, 246)')

  ctx.save()
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 3])

  /* Same field.pipes the fill uses, so the dashed overlay coincides exactly
   * with the filled columns — "what you see is what you hit" is structural,
   * not maintained. Only pending pillars are the live collision target. */
  for (const pipe of field.pipes) {
    if (pipe.status !== 'pending') continue

    ctx.strokeStyle = pipe.id === collidingId ? dangerColor : mutedColor
    for (const rect of [pipe.top, pipe.bottom]) {
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
    }
  }

  if (birdMidi != null) {
    const birdRect = getBirdRect(
      birdMidi,
      geom,
      height,
      props.midiMin,
      props.midiMax,
      props.gapHalfSemitones,
    )
    ctx.strokeStyle = collidingId !== null ? dangerColor : birdBoxColor
    ctx.strokeRect(birdRect.x, birdRect.y, birdRect.width, birdRect.height)
  }

  /* The same ceiling/floor rects the fill uses — danger-colored while the bird
   * is out of range, so the out-of-range crash band is unambiguous. */
  const birdOutOfRange =
    birdMidi != null &&
    isOutOfRange(birdMidi, props.midiMin, props.midiMax, props.gapHalfSemitones)
  ctx.strokeStyle = birdOutOfRange ? dangerColor : mutedColor
  for (const rect of [field.ceiling, field.floor]) {
    if (rect.width <= 0 || rect.height <= 0) continue

    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height)
  }

  ctx.restore()
}

function applyDeathShake(ctx: CanvasRenderingContext2D) {
  if (!deathAnim || deathAnim.reduced) return

  const elapsed = performance.now() - deathAnim.startTime
  if (elapsed >= DEATH_SHAKE_MS) return

  /* Amplitude decays linearly to 0 across the shake window. */
  const amplitude = DEATH_SHAKE_MAX_PX * (1 - elapsed / DEATH_SHAKE_MS)
  ctx.translate(
    (Math.random() * 2 - 1) * amplitude,
    (Math.random() * 2 - 1) * amplitude,
  )
}

function drawDeathOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  if (!deathAnim) return

  const elapsed = performance.now() - deathAnim.startTime
  if (elapsed >= deathAnim.durationMs) {
    endDeathAnim()
    return
  }
  const progress = elapsed / deathAnim.durationMs

  /* Impact flash — oversized so the shake translate never reveals an edge. */
  if (elapsed < DEATH_FLASH_MS) {
    const flashAlpha = 0.35 * (1 - elapsed / DEATH_FLASH_MS)
    ctx.save()
    ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`
    const margin = DEATH_SHAKE_MAX_PX + 4
    ctx.fillRect(-margin, -margin, width + margin * 2, height + margin * 2)
    ctx.restore()
  }

  const anchor = deathAnim.anchor
  if (!anchor) return

  /* Shockwave ring. */
  if (elapsed < DEATH_RING_MS) {
    const ringProgress = elapsed / DEATH_RING_MS
    ctx.save()
    ctx.strokeStyle = `rgba(180, 83, 9, ${0.6 * (1 - ringProgress)})`
    ctx.lineWidth = 3 * (1 - ringProgress) + 1
    ctx.beginPath()
    ctx.arc(
      anchor.x,
      anchor.y,
      DEATH_RING_MAX_PX * ringProgress,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
    ctx.restore()
  }

  /* Feather shards. Position is analytic (start + v·t + ½g·t²) so a frame
   * drawn more than once — the dedicated death RAF plus a still-running main
   * loop — stays idempotent. */
  const t = elapsed / 1000 // seconds
  const particleAlpha = 1 - progress
  for (const particle of deathAnim.particles) {
    const px = particle.x + particle.vx * t
    const py = particle.y + particle.vy * t + 0.5 * DEATH_GRAVITY_PX_S2 * t * t
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(particle.rotation + particle.spin * t)
    ctx.globalAlpha = particleAlpha
    ctx.fillStyle = particle.color
    const size = particle.size
    ctx.fillRect(-size / 2, -size / 2, size, size * 1.6)
    ctx.restore()
  }
}

function endDeathAnim() {
  deathAnim = null
  if (deathFrameId !== null) {
    cancelAnimationFrame(deathFrameId)
    deathFrameId = null
  }
}

function deathLoop() {
  drawChart()
  if (deathAnim !== null) {
    deathFrameId = requestAnimationFrame(deathLoop)
  } else {
    deathFrameId = null
  }
}

function startDeathAnim() {
  if (deathTriggeredThisRound) return

  deathTriggeredThisRound = true

  const reduced = prefersReducedMotion
  const anchor = lastBird.visible ? { x: lastBird.x, y: lastBird.y } : null

  const particles: DeathParticle[] = []
  if (anchor && !reduced) {
    /* Match the bird palette already used in drawBird. */
    const palette = [
      'rgb(251, 191, 36)', // amber body
      'rgb(180, 83, 9)', // burnt outline
      'rgb(234, 88, 12)', // beak
    ]
    for (let i = 0; i < DEATH_PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed =
        DEATH_SPEED_MIN_PX_S +
        Math.random() * (DEATH_SPEED_MAX_PX_S - DEATH_SPEED_MIN_PX_S)
      particles.push({
        x: anchor.x,
        y: anchor.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 3,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() * 2 - 1) * 12,
        color: palette[i % palette.length],
      })
    }
  }

  deathAnim = {
    startTime: performance.now(),
    durationMs: reduced ? DEATH_DURATION_REDUCED_MS : DEATH_DURATION_MS,
    reduced,
    anchor,
    particles,
  }

  if (deathFrameId === null) {
    deathLoop()
  }
}

/* DoReMi-style orange pitch line: a full-width dashed rule at the live sung
 * pitch + a dot and note label on the pickup line. Shown on the crash frame
 * (after CRASH_PREVIEW_DELAY_MS, so it doesn't pop in mid-death) to re-sing
 * against the frozen killer pipe's gap, and on idle when preview is on (a
 * steady-pitch reference while warming up — same pitch the bird shows).
 * Fractional MIDI from frequency for sub-semitone precision (same source
 * liveBirdMidi uses). Alphas run a touch stronger than DoReMiScaleItem's
 * /25–/80 because this canvas is far busier than that list. */
function drawPreviewLine(
  ctx: CanvasRenderingContext2D,
  geom: ChartGeometry,
  height: number,
) {
  if (props.previewLineMidi == null) return

  /* Test page bypass: draw in every phase, no crash delay. */
  if (!props.alwaysShowPreviewLine) {
    if (props.phase === 'idle') {
      /* Idle preview: show immediately, in step with the moving bird. */
    } else if (props.phase === 'crashed') {
      /* Hold back until the death moment has registered (burst settled). */
      if (
        crashStartedAt == null ||
        performance.now() - crashStartedAt < CRASH_PREVIEW_DELAY_MS
      ) {
        return
      }
    } else {
      return // playing / won: no line
    }
  }

  /* previewLineMidi is non-null here (guarded above). */
  const midi = resolveEffectiveMidi(
    props.previewLineMidi,
    props.previewLineFrequency,
  )

  const rounded = Math.round(midi)
  const outOfRange = rounded < props.midiMin || rounded > props.midiMax
  const color = outOfRange ? CRASHED_FILL : PREVIEW_LINE_COLOR

  const rawY = midiToY(
    midi,
    height,
    props.midiMin,
    props.midiMax,
    props.gapHalfSemitones,
  )
  const y = Math.max(PADDING_TOP, Math.min(height - PADDING_BOTTOM, rawY))
  const dotX = pickupLineX(geom)

  ctx.save()

  /* Full-width dashed rule across the chart so it visually cuts through the
   * frozen killer pipe's gap. */
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([6, 6])
  ctx.beginPath()
  ctx.moveTo(geom.chartLeftX, y)
  ctx.lineTo(geom.chartRightX, y)
  ctx.stroke()
  ctx.setLineDash([])

  /* Dot on the pickup line — the bird's column — so the eye reads "this is
   * your note now" at the same x the bird sits. */
  ctx.globalAlpha = 0.85
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(dotX, y, 4, 0, Math.PI * 2)
  ctx.fill()

  /* Label toward the far axis (RTL-aware) — the opposite side from the bird's
   * own gutter label, so the two never overlap. The line and dot stay at the
   * exact `y` (true midiToY of the sung pitch — same mapping the A2/A4 markers
   * use, so the indicator is still pitch-true); only the text glyph is nudged
   * +1px to optically match the bird's own label, which is likewise +1. */
  const labelSign = props.isRtl ? -1 : 1
  ctx.globalAlpha = 0.9
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = props.isRtl ? 'end' : 'start'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  ctx.fillText(midiToNoteLabel(rounded).label, dotX + labelSign * 16, y + 1)

  ctx.restore()
}

/* Reactive mirror of the canvas CSS size, kept in sync wherever the size is
 * (re)measured. Only the cheat-button overlay needs the size reactively (the
 * draw loop reads it fresh per frame), so this adds no extra observer. */
const cssSize = ref({ width: 0, height: 0 })

function emitSize() {
  const parent = canvasRef.value?.parentElement
  if (!parent) return

  const rect = parent.getBoundingClientRect()
  cssSize.value = { width: rect.width, height: rect.height }
  emit('resize', { width: rect.width, height: rect.height })
}

type CheatButton = { midi: number; label: string; x: number; y: number }

/* One button per semitone across the selected voice range, placed on the bird's
 * pickup line at the exact Y the bird would render for that note — same
 * geometry the renderer and collision use, so pressing a button puts the bird
 * precisely where its label sits. */
const cheatNoteButtons = computed<CheatButton[]>(() => {
  if (!props.cheatButtons) return []

  const { width, height } = cssSize.value
  if (width <= 0 || height <= 0) return []

  const geom = computeGeometry(width, props.isRtl ?? false)
  const x = pickupLineX(geom)

  const buttons: CheatButton[] = []
  for (let midi = props.midiMin; midi <= props.midiMax; midi++) {
    buttons.push({
      midi,
      label: midiToNoteLabel(midi).label,
      x,
      y: midiToY(
        midi,
        height,
        props.midiMin,
        props.midiMax,
        props.gapHalfSemitones,
      ),
    })
  }
  return buttons
})

function onCheatButtonDown(event: PointerEvent, midi: number) {
  /* Capture so a press that drifts off the tiny button still releases cleanly
   * (pointerup/cancel keep targeting this element). */
  ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
  emit('holdNote', midi)
}

function onCheatButtonUp() {
  emit('releaseNote')
}

function drawChart() {
  const canvas = canvasRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const parent = canvas.parentElement
  if (!parent) return

  const rect = parent.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.scale(dpr, dpr)

  ctx.clearRect(0, 0, width, height)

  const geom = computeGeometry(width, props.isRtl ?? false)
  const now = props.nowOverride ?? pausedAt ?? performance.now()

  /* Sample the flight path. The interval gate also makes repeated draws at
   * the same virtual `now` (manual-clock test page) idempotent; pruning keeps
   * the buffer to roughly the visible window (~16 dots). */
  if (
    props.phase === 'playing' &&
    now - lastTraceSampleTime >= TRACE_SAMPLE_INTERVAL_MS
  ) {
    const midi = liveBirdMidi()
    if (midi != null) {
      traceSamples.push({ time: now, midi })
      lastTraceSampleTime = now
    }
    traceSamples = traceSamples.filter((s) => now - s.time <= TRACE_MAX_AGE_MS)
  }

  /* Sustained-note label detection. Runs every frame (timestamp-based, so
   * frame-rate independent) — NOT on the dot-sample gate — so a held note is
   * timed accurately. Keyed on the actually-detected sung pitch
   * (currentRawMidi, null on silence): a silence-hold breaks the run and
   * never stamps a label. One label per occurrence, anchored at onset. */
  if (props.phase === 'playing') {
    const sung = props.currentRawMidi
    if (sung == null) {
      sustainedMidi = null
    } else {
      const rounded = Math.round(sung)
      if (rounded !== sustainedMidi) {
        sustainedMidi = rounded
        sustainedStartTime = now
        sustainedLabelEmitted = false
      } else if (
        !sustainedLabelEmitted &&
        now - sustainedStartTime >= TRACE_LABEL_MIN_HOLD_MS
      ) {
        traceLabels.push({
          time: sustainedStartTime,
          midi: rounded,
          label: midiToNoteLabel(rounded).label,
        })
        sustainedLabelEmitted = true
      }
    }
    traceLabels = traceLabels.filter((l) => now - l.time <= TRACE_MAX_AGE_MS)
  }

  ctx.save()
  applyDeathShake(ctx)

  /* Pickup line — where the bird sits. */
  ctx.save()
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)'
  ctx.setLineDash([2, 4])
  ctx.beginPath()
  const lineX = pickupLineX(geom)
  ctx.moveTo(lineX, PADDING_TOP)
  ctx.lineTo(lineX, height - PADDING_BOTTOM)
  ctx.stroke()
  ctx.restore()

  drawRangeLines(ctx, geom, height)

  /* One field description, consumed by both the fill and the debug overlay,
   * so they are the same pixels by construction. */
  const field = buildPlayfield({
    geom,
    now,
    targets: props.targets,
    height,
    midiMin: props.midiMin,
    midiMax: props.midiMax,
    gapHalfSemitones: props.gapHalfSemitones,
    boundaryCrash: boundaryCrash.value,
  })

  drawPlayfield(ctx, field)
  drawRangeLabels(ctx, geom, height)
  if (props.phase === 'idle') drawPerchBoard(ctx, geom, height)
  drawTrace(ctx, geom, height, now)
  drawBird(ctx, geom, height)
  drawHitboxes(ctx, geom, width, height, now, field)
  drawDeathOverlay(ctx, width, height)
  /* After the death overlay so it stays readable through and after the
   * transient crash burst. */
  drawPreviewLine(ctx, geom, height)

  /* Diagnostic: once-per-second dump of the actual rendered state (covers the
   * post-death 'complete' frame — the bug window — but not idle). */
  if (
    props.phase !== 'idle' &&
    now - lastSnapshotLogTime >= SNAPSHOT_LOG_INTERVAL_MS
  ) {
    lastSnapshotLogTime = now
    debugLog('[SingFly] snapshot', {
      phase: props.phase,
      crashCause: props.crashCause,
      isListening: props.isListening,
      renderLoopRunning: animationFrameId !== null,
      deathFrameRunning: deathFrameId !== null,
      nowSource:
        props.nowOverride != null
          ? 'override'
          : pausedAt != null
            ? 'paused'
            : 'perfNow',
      now,
      pausedAt,
      birdMidi: liveBirdMidi(),
      currentMidi: props.currentMidi,
      currentFrequency: props.currentFrequency,
      previewLineMidi: props.previewLineMidi,
      bird: { x: lastBird.x, y: lastBird.y, visible: lastBird.visible },
      pipes: field.pipes.map((pipe) => ({
        id: pipe.id,
        status: pipe.status,
        midi: pipe.midi,
        centerX: Math.round(pipe.centerX),
      })),
    })
  }

  ctx.restore()
}

function renderLoop() {
  drawChart()
  animationFrameId = requestAnimationFrame(renderLoop)
}

function startRendering() {
  if (animationFrameId !== null) return

  renderLoop()
}

function stopRendering() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}

/* Single lifecycle owner: every phase entry's side-effects in ONE place
 * (replaces the old isListening/currentMidi/gameState/targets watchers whose
 * interaction was the freeze invariant nobody owned). The render loop itself
 * is owned by `shouldAnimate` below; here we own clock freeze, trace reset and
 * the death burst. Not immediate — the initial paint is onMounted's. */
watch(
  () => props.phase,
  (phase) => {
    if (phase === 'idle' || phase === 'playing') {
      /* New round / back to idle: re-arm the death effect, drop any in-flight
       * animation, clear the flight-path trace, and run on the live clock. */
      deathTriggeredThisRound = false
      endDeathAnim()
      traceSamples = []
      lastTraceSampleTime = 0
      lastSnapshotLogTime = 0
      traceLabels = []
      sustainedMidi = null
      sustainedStartTime = 0
      sustainedLabelEmitted = false
      pausedAt = null
      crashStartedAt = null
    }

    if (phase === 'crashed') {
      /* Freeze the field clock so pipes/bird/trace pin to the crash frame
       * even though the loop keeps running for the live orange preview line
       * (drawPreviewLine is clock-independent). Owned action now, not an
       * emergent side-effect of the mic stopping. */
      if (pausedAt === null) pausedAt = performance.now()
      /* Arm the preview-line delay (real wall clock — the canvas `now` is
       * frozen at pausedAt here, so it can't measure elapsed time). */
      crashStartedAt = performance.now()
      startDeathAnim()
    } else if (phase === 'won') {
      /* Clean win: freeze too (no death burst, no preview line). */
      if (pausedAt === null) pausedAt = performance.now()
    }

    /* Paint the entered frame immediately (idle perch / frozen end frame);
     * 'playing' is driven by the render loop. */
    if (phase !== 'playing') drawChart()
  },
)

/* Render-loop gate — the single driver of start/stopRendering. Animate while
 * playing, while a live pitch feeds the bird/preview (idle preview or the
 * kept-alive post-crash mic), else paint one frame and stop. `pausedAt` (set
 * by the phase handler) keeps the field frozen even while the loop runs for
 * the crash preview line. */
const shouldAnimate = computed(
  () =>
    props.phase === 'playing' || props.isListening || props.currentMidi != null,
)

watch(
  shouldAnimate,
  (animate) => {
    if (animate) {
      startRendering()
    } else {
      drawChart()
      stopRendering()
    }
  },
  { immediate: true },
)

/* One redraw watcher for the static inputs that don't run the loop: geometry,
 * the manual-clock scrub, the hitbox toggle, and the live crash-preview pitch
 * (so the first post-death frame and a scrub update paint without waiting on a
 * RAF tick). */
watch(
  () => [
    props.midiMin,
    props.midiMax,
    props.isRtl,
    props.gapHalfSemitones,
    props.nowOverride,
    props.showHitboxes,
    props.previewLineMidi,
    props.previewLineFrequency,
    props.crashCause,
  ],
  () => drawChart(),
)

onMounted(() => {
  nextTick(() => {
    drawChart()
    emitSize()
  })

  const canvas = canvasRef.value
  const parent = canvas?.parentElement
  if (parent) {
    resizeObserver = new ResizeObserver(() => {
      emitSize()
      drawChart()
    })
    resizeObserver.observe(parent)
  }
})

onUnmounted(() => {
  stopRendering()
  if (deathFrameId !== null) {
    cancelAnimationFrame(deathFrameId)
    deathFrameId = null
  }
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div
    class="relative h-64 w-full flex-1 overflow-hidden rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) sm:h-80 dark:bg-(--p-surface-900)/50"
    data-testid="singfly-canvas"
  >
    <!-- Rendered BEFORE the canvas so it stacks underneath: the canvas is
      transparent (clearRect) and pointer-events-none, so the bird/pipes paint
      over these buttons while clicks still reach them. Physical `left` (not a
      logical property) is intentional — button.x comes from computeGeometry,
      which already mirrors the pickup line for RTL, so it is a left-origin
      canvas pixel matching the drawn bird. -->
    <div
      v-if="cheatButtons"
      class="pointer-events-none absolute inset-0"
      data-testid="singfly-cheat-buttons"
    >
      <!-- Plain <button> (not PrimeButton) on purpose: this is a debug-only aid
        and PrimeButton's root position:relative fights the absolute placement.
        A bare element keeps full control of position and sizing. -->
      <button
        v-for="button in cheatNoteButtons"
        :key="button.midi"
        type="button"
        class="pointer-events-auto absolute min-w-10 -translate-x-1/2 -translate-y-1/2 touch-none rounded border border-(--p-content-border-color) bg-(--p-content-background) px-1.5 py-0.5 text-xs leading-none text-(--p-text-color) shadow-sm select-none hover:bg-(--p-surface-100) active:bg-(--p-primary-color) active:text-(--p-primary-contrast-color) dark:hover:bg-(--p-surface-700)"
        :style="{ left: `${button.x}px`, top: `${button.y}px` }"
        @pointerdown.prevent="onCheatButtonDown($event, button.midi)"
        @pointerup="onCheatButtonUp"
        @pointercancel="onCheatButtonUp"
        @lostpointercapture="onCheatButtonUp"
      >
        {{ button.label }}
      </button>
    </div>

    <canvas
      ref="canvasRef"
      class="pointer-events-none absolute inset-0 h-full w-full"
    />
  </div>
</template>

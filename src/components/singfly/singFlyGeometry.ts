import {
  GAME_PICKUP_LINE_RATIO,
  HISTORY_WINDOW_MS,
  OUT_OF_RANGE_TOLERANCE_SEMITONES,
  RANGE_PAD_BUFFER_SEMITONES,
} from './singFlyConstants'
import type { GameTarget, GameTargetStatus } from './useSingFly'

/* Single source of truth for the singfly chart geometry. Pixel functions
 * here place the pipes/bird the renderer draws and decide *when* a pipe is
 * horizontally over the bird. Whether the bird is *in the gap* is a separate,
 * purely-semitone decision — isPitchInGap — shared verbatim by the renderer
 * (gap height), the scoring gate and the collision test, so "what you see is
 * what you hit" holds at every canvas size and voice range. */

/* Chart paddings for the singfly chart. PADDING_TOP/PADDING_BOTTOM are
 * also read by the canvas renderer; the rest are internal to geometry. */
export const PADDING_TOP = 16
export const PADDING_BOTTOM = 16
const PADDING_RIGHT = 16
const LABEL_WIDTH = 40
const CHART_INSET_RIGHT = 16

/* Lethal floor/ceiling wall placement, in semitones beyond the selected voice
 * range. It must clear the WIDEST opening any pipe at a range-edge note draws —
 * that's gapHalfSemitones — so the lowest/highest note still gets its full,
 * unclipped gap (the C3 gap == the C#3 gap) and the in-gap (isPitchInGap) and
 * out-of-range (isOutOfRange) decisions can never contradict at the edges.
 * Never nearer than OUT_OF_RANGE_TOLERANCE_SEMITONES even when the gap is
 * tiny. */
export function boundaryToleranceSemitones(gapHalfSemitones: number): number {
  return Math.max(OUT_OF_RANGE_TOLERANCE_SEMITONES, gapHalfSemitones)
}

/* Visual padding so edge targets (midi == midiMin/midiMax) have room for the
 * full pipe gap and label without bleeding into PADDING_TOP/PADDING_BOTTOM.
 * Also the bird-position band: the bird's Y is positionable only within
 * [midiMin - this, midiMax + this]; beyond it the bird freezes at the edge.
 * Sits RANGE_PAD_BUFFER_SEMITONES past the wall so the wall always renders as
 * a real bar (never a sliver). */
export function rangePadSemitones(gapHalfSemitones: number): number {
  return (
    boundaryToleranceSemitones(gapHalfSemitones) + RANGE_PAD_BUFFER_SEMITONES
  )
}

/* Pipe column width in CSS pixels. */
export const PIPE_WIDTH = 22

/* Bird circle radius in CSS pixels (the drawn visual). */
export const BIRD_RADIUS = 9

/* The bird's box is a square inscribed in the drawn circle: half-extent =
 * BIRD_RADIUS / √2 so the corners touch the circle. Used only for the bird's
 * horizontal extent (when a pipe column counts as "over the bird") and the
 * debug hitbox overlay — the in-gap (vertical) decision is isPitchInGap, not
 * this box. */
const BIRD_HITBOX_HALF = BIRD_RADIUS / Math.SQRT2

/* THE single source of truth for "is the bird in the gap". The bird is judged
 * by its pitch center vs the target note in semitone space — not by a pixel
 * box — so the answer is identical at every canvas size and voice range.
 * Scoring passes on this; collision crashes on its negation; getPipeRects
 * sizes the drawn gap from the same gapHalfSemitones. Drawn gap, scored band
 * and crash band can never diverge. */
export function isPitchInGap(
  birdMidi: number,
  targetMidi: number,
  gapHalfSemitones: number,
): boolean {
  return Math.abs(birdMidi - targetMidi) <= gapHalfSemitones
}

/* THE single source of truth for "is the bird out of range" — the ceiling/floor
 * analogue of isPitchInGap. The bird is judged by its pitch center vs the
 * selected voice range in semitone space (plus boundaryToleranceSemitones —
 * the wall recedes to the difficulty's gap half so an edge note's full opening
 * clears it), so the answer is identical at every canvas size and voice range.
 * The renderer draws the lethal wall exactly over this region
 * (getBoundaryRects), the collision test crashes the round on its truth, and
 * the debug hitbox strokes the same rects — drawn wall, crash band and hitbox
 * can never diverge. */
export function isOutOfRange(
  birdMidi: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): boolean {
  const tolerance = boundaryToleranceSemitones(gapHalfSemitones)

  return birdMidi > midiMax + tolerance || birdMidi < midiMin - tolerance
}

/* The bird's Y is positionable only within the visible band; a pitch beyond it
 * freezes the bird at the edge while the label still shows the real note.
 * Strict (> / <) so exactly ±rangePadSemitones is still movable. getBirdRect
 * clamps to the same bound, so frozen == "the clamp is engaged". */
export function isBirdPositionFrozen(
  birdMidi: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): boolean {
  const pad = rangePadSemitones(gapHalfSemitones)

  return birdMidi < midiMin - pad || birdMidi > midiMax + pad
}

export type Rect = { x: number; y: number; width: number; height: number }

export type ChartGeometry = {
  labelAxisX: number
  farAxisX: number
  nowEdgeX: number
  chartLeftX: number
  chartRightX: number
}

export function midiToY(
  midi: number,
  height: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): number {
  const usableHeight = height - PADDING_TOP - PADDING_BOTTOM
  const pad = rangePadSemitones(gapHalfSemitones)
  const paddedMin = midiMin - pad
  const paddedMax = midiMax + pad
  const ratio = (midi - paddedMin) / (paddedMax - paddedMin)

  return PADDING_TOP + usableHeight * (1 - ratio)
}

export function computeGeometry(width: number, isRtl: boolean): ChartGeometry {
  const labelAxisX = isRtl ? width - LABEL_WIDTH : LABEL_WIDTH
  const farAxisX = isRtl ? PADDING_RIGHT : width - PADDING_RIGHT
  const nowEdgeX = isRtl
    ? PADDING_RIGHT + CHART_INSET_RIGHT
    : width - PADDING_RIGHT - CHART_INSET_RIGHT

  return {
    labelAxisX,
    farAxisX,
    nowEdgeX,
    chartLeftX: Math.min(labelAxisX, farAxisX),
    chartRightX: Math.max(labelAxisX, farAxisX),
  }
}

export function pickupLineX(geom: ChartGeometry): number {
  return (
    geom.labelAxisX + GAME_PICKUP_LINE_RATIO * (geom.farAxisX - geom.labelAxisX)
  )
}

function timeToX(timestamp: number, now: number, geom: ChartGeometry): number {
  const age = now - timestamp
  const ratio = age / HISTORY_WINDOW_MS

  return geom.nowEdgeX + (geom.labelAxisX - geom.nowEdgeX) * ratio
}

/* Bird collision/draw anchor. The pitch is first clamped to the bird-position
 * band [midiMin - rangePad, midiMax + rangePad] so a far out-of-range note
 * freezes the bird at the edge instead of dragging it further (the label still
 * shows the real note — see isBirdPositionFrozen). Y is then clamped to the
 * chart area exactly as the canvas clamps the drawn circle (keyed on
 * BIRD_RADIUS so the hitbox stays centered on the visible bird), then a square
 * of half-extent BIRD_HITBOX_HALF is centered on it. The clamp is Y-only
 * (centerX is the pickup line); isPitchInGap/isOutOfRange judge the raw pitch,
 * so scoring/collision/death are unaffected. */
export function getBirdRect(
  birdMidi: number,
  geom: ChartGeometry,
  height: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): Rect {
  const pad = rangePadSemitones(gapHalfSemitones)
  const positionMidi = Math.max(
    midiMin - pad,
    Math.min(midiMax + pad, birdMidi),
  )
  const rawY = midiToY(positionMidi, height, midiMin, midiMax, gapHalfSemitones)
  const centerY = Math.max(
    PADDING_TOP + BIRD_RADIUS,
    Math.min(height - PADDING_BOTTOM - BIRD_RADIUS, rawY),
  )
  const centerX = pickupLineX(geom)

  return {
    x: centerX - BIRD_HITBOX_HALF,
    y: centerY - BIRD_HITBOX_HALF,
    width: BIRD_HITBOX_HALF * 2,
    height: BIRD_HITBOX_HALF * 2,
  }
}

/* Y of the boundary wall's inner edges: the ceiling's bottom and the floor's
 * top — the same boundaryToleranceSemitones band getBoundaryRects fills and
 * isOutOfRange crashes on. Single source of truth so the pillars (which clamp
 * their solid columns to this) and the drawn wall meet on the exact same pixel
 * line at every canvas size and voice range. */
function boundaryEdgesY(
  height: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): { ceilingBottomY: number; floorTopY: number } {
  const tolerance = boundaryToleranceSemitones(gapHalfSemitones)

  return {
    ceilingBottomY: midiToY(
      midiMax + tolerance,
      height,
      midiMin,
      midiMax,
      gapHalfSemitones,
    ),
    floorTopY: midiToY(
      midiMin - tolerance,
      height,
      midiMin,
      midiMax,
      gapHalfSemitones,
    ),
  }
}

/* Outer edges of the lethal band, capped to PIPE_WIDTH so the green ceiling /
 * floor band is exactly as thick as a pillar is wide at every viewport height
 * (without a cap the band scales with viewport: ~22px on a short phone, much
 * thicker on a tall desktop, so it never visually matches the fixed-width
 * pillars). Anchored at the inner (gameplay) edge and trimmed outward toward
 * the chart edge — the inner edge (where tones align / isOutOfRange begins)
 * never moves, so collision/scoring are unaffected. On a viewport too short
 * for a full-thickness band the max/min keeps the smaller natural band: the
 * cap only ever trims, never grows. Pillar columns clamp to these same outer
 * edges (getPipeRects) so pillar + wall merge into one continuous,
 * uniform-thickness obstacle with clean white space beyond. */
function boundaryBandY(
  height: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): {
  ceilingTopY: number
  ceilingBottomY: number
  floorTopY: number
  floorBottomY: number
} {
  const { ceilingBottomY, floorTopY } = boundaryEdgesY(
    height,
    midiMin,
    midiMax,
    gapHalfSemitones,
  )

  return {
    ceilingTopY: Math.max(PADDING_TOP, ceilingBottomY - PIPE_WIDTH),
    ceilingBottomY,
    floorTopY,
    floorBottomY: Math.min(height - PADDING_BOTTOM, floorTopY + PIPE_WIDTH),
  }
}

/* The capped ceiling/floor rects, derived from one band description so
 * getBoundaryRects and buildPlayfield can never disagree (the "one span source"
 * invariant the tests assert). */
function boundaryRectsFromSpan(
  span: { x: number; width: number },
  band: ReturnType<typeof boundaryBandY>,
): BoundaryRects {
  return {
    ceiling: {
      x: span.x,
      y: band.ceilingTopY,
      width: span.width,
      height: band.ceilingBottomY - band.ceilingTopY,
    },
    floor: {
      x: span.x,
      y: band.floorTopY,
      width: span.width,
      height: band.floorBottomY - band.floorTopY,
    },
  }
}

export type PipeRects = {
  top: Rect
  bottom: Rect
  /* Gap center Y and pipe center X — the canvas reuses these to place the
   * note label without recomputing the geometry. */
  gapY: number
  centerX: number
}

export function getPipeRects(
  target: GameTarget,
  now: number,
  geom: ChartGeometry,
  height: number,
  midiMin: number,
  midiMax: number,
  gapHalfSemitones: number,
): PipeRects {
  /* Half-gap height in pixels — the pixel projection of the same
   * gapHalfSemitones the scoring/collision predicate uses, so the drawn gap is
   * exactly the band that is tested. */
  const gapHalfPx = Math.abs(
    midiToY(midiMin, height, midiMin, midiMax, gapHalfSemitones) -
      midiToY(
        midiMin + gapHalfSemitones,
        height,
        midiMin,
        midiMax,
        gapHalfSemitones,
      ),
  )

  const centerX = timeToX(target.dueTime, now, geom)
  const gapY = midiToY(target.midi, height, midiMin, midiMax, gapHalfSemitones)
  const gapTop = gapY - gapHalfPx
  const gapBottom = gapY + gapHalfPx
  const pipeLeft = centerX - PIPE_WIDTH / 2

  /* Columns clamp to the wall's OUTER edges (boundaryBandY) — the same edges
   * the drawn ceiling/floor band uses, capped to PIPE_WIDTH thickness. They
   * are drawn on top of the boundary wall with the same opaque fill, so a
   * pillar fully replaces the wall at its column and the two merge into one
   * continuous, uniform-thickness obstacle with no seam (and no thin
   * "flagpole" of column poking above a now-thin ceiling). Math.max(0, …): an
   * edge note with a wide difficulty gap can push a gap edge past the chart
   * edge, collapsing that segment to nothing. */
  const { ceilingTopY, floorBottomY } = boundaryBandY(
    height,
    midiMin,
    midiMax,
    gapHalfSemitones,
  )
  const chartTop = ceilingTopY
  const chartBottom = floorBottomY

  return {
    top: {
      x: pipeLeft,
      y: chartTop,
      width: PIPE_WIDTH,
      height: Math.max(0, gapTop - chartTop),
    },
    bottom: {
      x: pipeLeft,
      y: gapBottom,
      width: PIPE_WIDTH,
      height: Math.max(0, chartBottom - gapBottom),
    },
    gapY,
    centerX,
  }
}

export type BoundaryRects = { ceiling: Rect; floor: Rect }

/* Centers of the pillars actually drawn this frame — exactly the cull bounds
 * the renderer/hitbox use ([chartLeftX - PIPE_WIDTH, chartRightX + PIPE_WIDTH]).
 * Off-screen pillars (not yet entered, or bulk-'missed' far in the future on a
 * game-over frame) are excluded so they can't drag the boundary span. THE
 * single source for "which pillars are on screen", consumed by both the pipe
 * list and the ceiling/floor span so the two can never disagree again. */
function drawnPipeCenters(
  targets: GameTarget[],
  now: number,
  geom: ChartGeometry,
): number[] {
  return targets
    .map((target) => timeToX(target.dueTime, now, geom))
    .filter(
      (centerX) =>
        centerX >= geom.chartLeftX - PIPE_WIDTH &&
        centerX <= geom.chartRightX + PIPE_WIDTH,
    )
}

/* The horizontal span the ceiling/floor wall fills — derived from the SAME
 * drawn pillars (drawnPipeCenters) the pipe columns use. Anchored at the
 * chart's left (exit) edge, extending further left only to cover a pillar
 * mid-exit (its column pokes left past chartLeftX); on the right it follows the
 * rightmost drawn pillar's far edge — receding with empty sky beyond, or flush
 * where a pillar pokes past chartRightX as it enters. Full
 * chartLeftX..chartRightX when nothing is drawn (idle/preview, or all pillars
 * still streaming in off-screen) as a range reference. */
function boundarySpan(
  geom: ChartGeometry,
  drawnCenters: number[],
): { x: number; width: number } {
  let leftX = geom.chartLeftX
  let rightX = geom.chartRightX

  if (drawnCenters.length > 0) {
    leftX = Math.min(
      geom.chartLeftX,
      Math.min(...drawnCenters) - PIPE_WIDTH / 2,
    )
    rightX = Math.max(...drawnCenters) + PIPE_WIDTH / 2
  }

  /* width <= 0 only on a frozen post-game frame where every pillar has fully
   * exited far left — callers skip via their width <= 0 guard. */
  return { x: leftX, width: rightX - leftX }
}

/* The lethal ceiling/floor rectangles. Vertically: the pixel projection of the
 * tolerance band, derived from the same midiToY so the drawn wall and the debug
 * hitbox are one region. rangePadSemitones = tolerance +
 * RANGE_PAD_BUFFER_SEMITONES keeps an empty buffer between the range-edge line
 * and the wall, and the wall recedes to the difficulty's gap half so an edge
 * note's full opening clears it. Horizontal span: see boundarySpan — the same
 * drawn pillars the columns use. This span is purely cosmetic; the crash test
 * is isOutOfRange, an X-independent semitone predicate, so "what you see is
 * what you hit" holds. */
export function getBoundaryRects(
  geom: ChartGeometry,
  height: number,
  midiMin: number,
  midiMax: number,
  targets: GameTarget[],
  now: number,
  gapHalfSemitones: number,
): BoundaryRects {
  const span = boundarySpan(geom, drawnPipeCenters(targets, now, geom))
  const band = boundaryBandY(height, midiMin, midiMax, gapHalfSemitones)

  return boundaryRectsFromSpan(span, band)
}

export type PlayfieldPipe = {
  id: number
  status: GameTargetStatus
  midi: number
  top: Rect
  bottom: Rect
  /* Gap center Y and pipe center X — the renderer reuses these to place the
   * note label without recomputing the geometry. */
  gapY: number
  centerX: number
}

/* THE single frame description the renderer and the debug hitbox both consume,
 * so the filled shapes and the collision visualizer are structurally the same
 * pixels (no "keep the wall flush with the pipes" patching).
 *
 * `solids` is the flat list of every solid rectangle this frame — ceiling,
 * floor, and each drawn pillar's top/bottom column. The renderer unions them
 * into ONE Path2D and fills once: overlaps merge by winding rule, internal
 * seams are impossible and draw order is irrelevant (no more
 * drawPipes-then-drawBoundary ordering). `crashed` is the subset to overlay in
 * the danger color — the crashed pillar's column and/or the lethal boundary
 * side. Path2D is built in the renderer (DOM), not here, so this stays a pure,
 * test-friendly projection. */
export type Playfield = {
  pipes: PlayfieldPipe[]
  ceiling: Rect
  floor: Rect
  solids: Rect[]
  crashed: Rect[]
}

function hasArea(rect: Rect): boolean {
  return rect.width > 0 && rect.height > 0
}

/* Intersect a rect with the vertical band [top, bottom], or null if it falls
 * entirely outside. Used to keep the crashed-pillar red inside the play area
 * only, so the ceiling/floor wall stays green where the red pillar passes
 * through it. */
function clipY(rect: Rect, top: number, bottom: number): Rect | null {
  const y = Math.max(rect.y, top)
  const yEnd = Math.min(rect.y + rect.height, bottom)
  if (yEnd <= y) return null

  return { x: rect.x, y, width: rect.width, height: yEnd - y }
}

export function buildPlayfield(args: {
  geom: ChartGeometry
  now: number
  targets: GameTarget[]
  height: number
  midiMin: number
  midiMax: number
  gapHalfSemitones: number
  boundaryCrash: 'floor' | 'ceiling' | null
}): Playfield {
  const {
    geom,
    now,
    targets,
    height,
    midiMin,
    midiMax,
    gapHalfSemitones,
    boundaryCrash,
  } = args

  const span = boundarySpan(geom, drawnPipeCenters(targets, now, geom))
  const band = boundaryBandY(height, midiMin, midiMax, gapHalfSemitones)
  const { ceiling, floor } = boundaryRectsFromSpan(span, band)
  /* clipY (crashed-pillar overlay) keys off the wall's INNER edges so the red
   * never enters the green band. The band's outer edges may now be trimmed
   * (capped to PIPE_WIDTH), but the inner edges still come from boundaryEdgesY
   * via boundaryBandY. */
  const { ceilingBottomY, floorTopY } = band

  const pipes: PlayfieldPipe[] = []
  const solids: Rect[] = []
  const crashed: Rect[] = []

  if (hasArea(ceiling)) solids.push(ceiling)
  if (hasArea(floor)) solids.push(floor)

  for (const target of targets) {
    const rects = getPipeRects(
      target,
      now,
      geom,
      height,
      midiMin,
      midiMax,
      gapHalfSemitones,
    )
    /* Same cull the boundary span uses (drawnPipeCenters) — one definition. */
    if (
      rects.centerX < geom.chartLeftX - PIPE_WIDTH ||
      rects.centerX > geom.chartRightX + PIPE_WIDTH
    ) {
      continue
    }

    const pipe: PlayfieldPipe = {
      id: target.id,
      status: target.status,
      midi: target.midi,
      top: rects.top,
      bottom: rects.bottom,
      gapY: rects.gapY,
      centerX: rects.centerX,
    }
    pipes.push(pipe)

    for (const rect of [pipe.top, pipe.bottom]) {
      if (!hasArea(rect)) continue

      solids.push(rect)
      /* Only the one pillar the bird flew into is danger-colored — every other
       * pillar (passed or unresolved) stays the solid wall. The red is clipped
       * to the play area so the ceiling/floor wall stays green where the
       * crashed pillar passes through it (the wall didn't kill you — the
       * pillar did). */
      if (target.status === 'crashed') {
        const inPlay = clipY(rect, ceilingBottomY, floorTopY)
        if (inPlay) crashed.push(inPlay)
      }
    }
  }

  /* The lethal side the bird died against gets the same danger overlay as a
   * crashed pillar, so a fell-into-the-floor death reads like a flew-into-a-
   * pillar death. */
  if (boundaryCrash === 'ceiling' && hasArea(ceiling)) crashed.push(ceiling)
  if (boundaryCrash === 'floor' && hasArea(floor)) crashed.push(floor)

  return { pipes, ceiling, floor, solids, crashed }
}

type CollisionParams = {
  targets: GameTarget[]
  birdMidi: number | null
  now: number
  width: number
  height: number
  isRtl: boolean
  midiMin: number
  midiMax: number
  gapHalfSemitones: number
}

/* Returns the id of the first pending pipe the bird crashes into, or null.
 *
 * A crash is: the pipe column is horizontally over the bird right now AND the
 * bird's pitch is outside the gap (isPitchInGap === false). The vertical
 * decision is the same semitone predicate the scoring gate uses — never a
 * pixel box vs the drawn rect — so "you scored" and "you didn't crash" are the
 * exact same boolean at any canvas size or voice range. Only the horizontal
 * "is the pipe at the bird yet" test stays positional (x has no
 * point-vs-box ambiguity). No bird (silent player) or an unmeasured canvas
 * means no collision is possible. */
export function findCollidingTarget(params: CollisionParams): number | null {
  const {
    targets,
    birdMidi,
    now,
    width,
    height,
    isRtl,
    midiMin,
    midiMax,
    gapHalfSemitones,
  } = params
  if (birdMidi === null || width <= 0 || height <= 0) return null

  const geom = computeGeometry(width, isRtl)
  const birdRect = getBirdRect(
    birdMidi,
    geom,
    height,
    midiMin,
    midiMax,
    gapHalfSemitones,
  )

  for (const target of targets) {
    if (target.status !== 'pending') continue

    const pipe = getPipeRects(
      target,
      now,
      geom,
      height,
      midiMin,
      midiMax,
      gapHalfSemitones,
    )
    /* Pipe column (top/bottom share one x extent) currently over the bird. */
    const xOverlap =
      birdRect.x < pipe.top.x + pipe.top.width &&
      birdRect.x + birdRect.width > pipe.top.x

    if (xOverlap && !isPitchInGap(birdMidi, target.midi, gapHalfSemitones)) {
      return target.id
    }
  }

  return null
}

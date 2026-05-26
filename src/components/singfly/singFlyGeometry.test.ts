import { describe, expect, test } from 'vitest'
import {
  DIFFICULTY_GAP_HALF_SEMITONES,
  HISTORY_WINDOW_MS,
} from './singFlyConstants'
import {
  PADDING_BOTTOM,
  PADDING_TOP,
  PIPE_WIDTH,
  boundaryToleranceSemitones,
  buildPlayfield,
  computeGeometry,
  findCollidingTarget,
  getBirdRect,
  getBoundaryRects,
  getPipeRects,
  isBirdPositionFrozen,
  isOutOfRange,
  isPitchInGap,
  midiToY,
  pickupLineX,
  rangePadSemitones,
} from './singFlyGeometry'
import type { GameTarget } from './useSingFly'

/* The boundary/pad tests below assert exact semitone offsets. They use the
 * hard gap (1) so boundaryToleranceSemitones == OUT_OF_RANGE_TOLERANCE_SEMITONES
 * (1) and rangePadSemitones == 2 — the pre-difficulty-scaling values, so the
 * "1-semitone buffer" wording in those describes still reads literally. The
 * per-difficulty behavior is covered by its own describe. */
const TEST_GAP = DIFFICULTY_GAP_HALF_SEMITONES.hard
const t = boundaryToleranceSemitones(TEST_GAP)
const pad = rangePadSemitones(TEST_GAP)

/* Place a pipe so its column sits exactly on the pickup line (over the bird)
 * at time `now`. Inverts timeToX: centerX = nowEdgeX + (labelAxisX - nowEdgeX)
 * * (age / HISTORY_WINDOW_MS), solved for age with centerX = pickupLineX. */
function dueTimeAtPickup(width: number, isRtl: boolean, now: number): number {
  const geom = computeGeometry(width, isRtl)
  const pickup = pickupLineX(geom)
  const ratio = (pickup - geom.nowEdgeX) / (geom.labelAxisX - geom.nowEdgeX)

  return now - ratio * HISTORY_WINDOW_MS
}

const NOW = 100_000

function collidesAtPickup(args: {
  width: number
  height: number
  midiMin: number
  midiMax: number
  targetMidi: number
  birdMidi: number | null
  gapHalfSemitones: number
}): boolean {
  const target: GameTarget = {
    id: 1,
    midi: args.targetMidi,
    dueTime: dueTimeAtPickup(args.width, false, NOW),
    status: 'pending',
  }

  return (
    findCollidingTarget({
      targets: [target],
      birdMidi: args.birdMidi,
      now: NOW,
      width: args.width,
      height: args.height,
      isRtl: false,
      midiMin: args.midiMin,
      midiMax: args.midiMax,
      gapHalfSemitones: args.gapHalfSemitones,
    }) === target.id
  )
}

describe('isPitchInGap', () => {
  test('boundary is inclusive (exactly on the edge passes)', () => {
    expect(isPitchInGap(51.5, 50, 1.5)).toBe(true)
    expect(isPitchInGap(48.5, 50, 1.5)).toBe(true)
    expect(isPitchInGap(51.6, 50, 1.5)).toBe(false)
  })
})

describe('scoring ⇔ collision agreement (single source of truth)', () => {
  /* The whole point of the refactor: the band you score in is the exact band
   * you do not crash in, at any canvas size or voice range. */
  const scenarios = [
    {
      name: 'tall canvas, wide range',
      width: 700,
      height: 320,
      midiMin: 48,
      midiMax: 72,
    },
    {
      name: 'small canvas, narrow range',
      width: 360,
      height: 256,
      midiMin: 48,
      midiMax: 60,
    },
    {
      name: 'small canvas, very wide range',
      width: 360,
      height: 256,
      midiMin: 36,
      midiMax: 84,
    },
  ]
  const gapHalfSemitones = 1.5
  const targetMidi = 55

  for (const scenario of scenarios) {
    test(scenario.name, () => {
      /* Sweep the bird across ±3 st; collided must always equal "outside the
       * gap" — never screen-size dependent (the old box-vs-pixel bug). */
      for (let offset = -3; offset <= 3; offset += 0.25) {
        const birdMidi = targetMidi + offset
        const inGap = isPitchInGap(birdMidi, targetMidi, gapHalfSemitones)
        const collided = collidesAtPickup({
          ...scenario,
          targetMidi,
          birdMidi,
          gapHalfSemitones,
        })

        expect(collided, `offset ${offset}`).toBe(!inGap)
      }
    })
  }
})

describe('horizontal gating', () => {
  test('a wildly off pitch does not crash a pipe that is not over the bird', () => {
    /* Pipe still at the live edge (dueTime === now → age 0 → far from the
     * pickup line): no x-overlap, so no crash regardless of pitch. */
    const target: GameTarget = {
      id: 1,
      midi: 55,
      dueTime: NOW,
      status: 'pending',
    }
    const collidingId = findCollidingTarget({
      targets: [target],
      birdMidi: 40,
      now: NOW,
      width: 700,
      height: 320,
      isRtl: false,
      midiMin: 48,
      midiMax: 72,
      gapHalfSemitones: 1.5,
    })

    expect(collidingId).toBeNull()
  })

  test('a silent player (no bird) never collides', () => {
    expect(
      collidesAtPickup({
        width: 700,
        height: 320,
        midiMin: 48,
        midiMax: 72,
        targetMidi: 55,
        birdMidi: null,
        gapHalfSemitones: 1.5,
      }),
    ).toBe(false)
  })
})

describe('isOutOfRange', () => {
  const midiMin = 48
  const midiMax = 72

  test('inside the range is safe', () => {
    expect(isOutOfRange(60, midiMin, midiMax, TEST_GAP)).toBe(false)
    expect(isOutOfRange(midiMin, midiMin, midiMax, TEST_GAP)).toBe(false)
    expect(isOutOfRange(midiMax, midiMin, midiMax, TEST_GAP)).toBe(false)
  })

  test('the tolerance margin is safe; just past the wall is fatal', () => {
    /* Singing exactly your top/bottom note plus the grace margin still passes;
     * one hair beyond crashes — strict inequality, so the wall inner edge is
     * the boundary. */
    expect(isOutOfRange(midiMax + t, midiMin, midiMax, TEST_GAP)).toBe(false)
    expect(isOutOfRange(midiMax + t + 0.01, midiMin, midiMax, TEST_GAP)).toBe(
      true,
    )
    expect(isOutOfRange(midiMin - t, midiMin, midiMax, TEST_GAP)).toBe(false)
    expect(isOutOfRange(midiMin - t - 0.01, midiMin, midiMax, TEST_GAP)).toBe(
      true,
    )
  })

  test('the wall recedes to the difficulty gap (edge-note opening clears it)', () => {
    /* With easy's gap (2), the lethal wall sits 2 st past the range, so a pitch
     * 2 st below the lowest note — still inside an edge pillar's opening — is
     * NOT a floor crash. At hard's gap (1) the same pitch IS fatal. */
    const easy = DIFFICULTY_GAP_HALF_SEMITONES.easy
    expect(isOutOfRange(midiMin - easy, midiMin, midiMax, easy)).toBe(false)
    expect(isOutOfRange(midiMin - easy - 0.01, midiMin, midiMax, easy)).toBe(
      true,
    )
    expect(
      isOutOfRange(
        midiMin - easy,
        midiMin,
        midiMax,
        DIFFICULTY_GAP_HALF_SEMITONES.hard,
      ),
    ).toBe(true)
  })
})

describe('edge-note opening is never clipped by the wall', () => {
  /* The fix: every note — including the lowest/highest — gets its full,
   * unclipped gap, and isPitchInGap can never contradict isOutOfRange at the
   * edges. Worst case: small canvas, very wide range. */
  const width = 360
  const height = 256
  const midiMin = 36
  const midiMax = 84
  const geom = computeGeometry(width, false)

  for (const difficulty of ['easy', 'normal', 'hard'] as const) {
    const gap = DIFFICULTY_GAP_HALF_SEMITONES[difficulty]

    test(`${difficulty}: lowest-note pillar's full opening clears the floor`, () => {
      const target: GameTarget = {
        id: 1,
        midi: midiMin,
        dueTime: dueTimeAtPickup(width, false, NOW),
        status: 'pending',
      }
      const pipe = getPipeRects(
        target,
        NOW,
        geom,
        height,
        midiMin,
        midiMax,
        gap,
      )
      const { floor } = getBoundaryRects(
        geom,
        height,
        midiMin,
        midiMax,
        [target],
        NOW,
        gap,
      )

      /* The opening's lowest point (bottom pillar's top edge) must be at or
       * above the floor wall's inner edge — the wall never eats the gap. */
      expect(pipe.bottom.y).toBeLessThanOrEqual(floor.y + 0.01)
    })

    test(`${difficulty}: highest-note pillar's full opening clears the ceiling`, () => {
      const target: GameTarget = {
        id: 1,
        midi: midiMax,
        dueTime: dueTimeAtPickup(width, false, NOW),
        status: 'pending',
      }
      const pipe = getPipeRects(
        target,
        NOW,
        geom,
        height,
        midiMin,
        midiMax,
        gap,
      )
      const { ceiling } = getBoundaryRects(
        geom,
        height,
        midiMin,
        midiMax,
        [target],
        NOW,
        gap,
      )

      /* The opening's highest point (top pillar's bottom edge) must be at or
       * below the ceiling wall's inner edge. */
      expect(pipe.top.y + pipe.top.height).toBeGreaterThanOrEqual(
        ceiling.y + ceiling.height - 0.01,
      )
    })

    test(`${difficulty}: in-gap never contradicts out-of-range at the edges`, () => {
      /* Sweep the bird across an edge note's full opening; any pitch judged
       * "in the gap" must NOT also be judged "out of range" (the old bug at
       * midiMin/midiMax). */
      for (const edge of [midiMin, midiMax]) {
        for (let offset = -gap; offset <= gap; offset += 0.1) {
          const birdMidi = edge + offset
          if (isPitchInGap(birdMidi, edge, gap)) {
            expect(
              isOutOfRange(birdMidi, midiMin, midiMax, gap),
              `${difficulty} edge ${edge} offset ${offset.toFixed(2)}`,
            ).toBe(false)
          }
        }
      }
    })
  }
})

describe('getBoundaryRects (drawn wall == isOutOfRange region)', () => {
  const width = 700
  const height = 320
  const midiMin = 48
  const midiMax = 72
  const geom = computeGeometry(width, false)

  /* A pillar whose column sits exactly on the pickup line at NOW — on-screen
   * and well inside the chart, so the field clamp binds (not the chart edge). */
  const pillarAtPickup: GameTarget = {
    id: 1,
    midi: 60,
    dueTime: dueTimeAtPickup(width, false, NOW),
    status: 'pending',
  }

  test('vertical extents are unchanged regardless of targets', () => {
    /* Tolerance band + one-semitone empty buffer hold whether the wall is
     * full-width (no targets) or trimmed (a pillar present). */
    for (const targets of [[], [pillarAtPickup]]) {
      const { ceiling, floor } = getBoundaryRects(
        geom,
        height,
        midiMin,
        midiMax,
        targets,
        NOW,
        TEST_GAP,
      )

      expect(ceiling.y).toBe(PADDING_TOP)
      expect(ceiling.y + ceiling.height).toBeCloseTo(
        midiToY(midiMax + t, height, midiMin, midiMax, TEST_GAP),
      )
      expect(floor.y).toBeCloseTo(
        midiToY(midiMin - t, height, midiMin, midiMax, TEST_GAP),
      )
      expect(floor.y + floor.height).toBeCloseTo(height - PADDING_BOTTOM)

      /* The range-edge note (where the C4/C3 label renders) stays outside
       * both walls — the one-semitone buffer. */
      expect(
        midiToY(midiMax, height, midiMin, midiMax, TEST_GAP),
      ).toBeGreaterThan(ceiling.y + ceiling.height)
      expect(midiToY(midiMin, height, midiMin, midiMax, TEST_GAP)).toBeLessThan(
        floor.y,
      )
    }
  })

  test('band thickness is capped to PIPE_WIDTH on tall viewports, inner edge holds', () => {
    /* The visible band scales with viewport height (~RANGE_PAD_BUFFER_SEMITONES
     * worth of pixels). Without the cap a tall desktop band would dwarf the
     * fixed-width pillars; capped, both ceiling and floor sit at exactly
     * PIPE_WIDTH while the inner (gameplay) edges stay at midiToY(midiMax + t)
     * / midiToY(midiMin - t). Identical thickness at any height. */
    for (const tallHeight of [700, 1200]) {
      const { ceiling, floor } = getBoundaryRects(
        geom,
        tallHeight,
        midiMin,
        midiMax,
        [],
        NOW,
        TEST_GAP,
      )

      expect(ceiling.height).toBeCloseTo(PIPE_WIDTH)
      expect(floor.height).toBeCloseTo(PIPE_WIDTH)
      /* Inner edges (where tones align / isOutOfRange begins) unchanged. */
      expect(ceiling.y + ceiling.height).toBeCloseTo(
        midiToY(midiMax + t, tallHeight, midiMin, midiMax, TEST_GAP),
      )
      expect(floor.y).toBeCloseTo(
        midiToY(midiMin - t, tallHeight, midiMin, midiMax, TEST_GAP),
      )
      /* White space trimmed beyond the band, not eaten into the inner edge. */
      expect(ceiling.y).toBeGreaterThan(PADDING_TOP)
      expect(floor.y + floor.height).toBeLessThan(tallHeight - PADDING_BOTTOM)
    }
  })

  test('short viewport: natural band is thinner than PIPE_WIDTH and kept as-is', () => {
    /* When the unscaled band is already smaller than PIPE_WIDTH the cap must
     * not grow it — only ever trims. So ceiling stays anchored at PADDING_TOP
     * and floor at height - PADDING_BOTTOM, the pre-cap behavior. */
    const shortHeight = 260
    const { ceiling, floor } = getBoundaryRects(
      geom,
      shortHeight,
      midiMin,
      midiMax,
      [],
      NOW,
      TEST_GAP,
    )

    expect(ceiling.height).toBeLessThan(PIPE_WIDTH)
    expect(ceiling.y).toBe(PADDING_TOP)
    expect(floor.y + floor.height).toBeCloseTo(shortHeight - PADDING_BOTTOM)
  })

  test('no targets → full-width walls (idle/preview reference)', () => {
    const { ceiling, floor } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [],
      NOW,
      TEST_GAP,
    )

    for (const rect of [ceiling, floor]) {
      expect(rect.x).toBe(geom.chartLeftX)
      expect(rect.width).toBe(geom.chartRightX - geom.chartLeftX)
    }
  })

  test('a single pillar: anchored at the left edge, extends up to the pillar', () => {
    /* dueTimeAtPickup places the column exactly on the pickup line at NOW. */
    const centerX = pickupLineX(geom)
    const { ceiling, floor } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [pillarAtPickup],
      NOW,
      TEST_GAP,
    )

    for (const rect of [ceiling, floor]) {
      /* Always starts at the chart's left (exit) edge — never trimmed there. */
      expect(rect.x).toBe(geom.chartLeftX)
      /* Stops at the pillar's far edge. */
      expect(rect.x + rect.width).toBeCloseTo(centerX + PIPE_WIDTH / 2)
      /* Still narrower than the full play area (stops before the right edge). */
      expect(rect.width).toBeLessThan(geom.chartRightX - geom.chartLeftX)
    }
    expect(ceiling.width).toBe(floor.width)
  })

  test('last pillar off-screen right → full-width (clamped to chartRightX)', () => {
    /* dueTime far in the future relative to NOW → pillar still past the live
     * edge (not yet entered): more pillars coming, so the wall stays full. */
    const future: GameTarget = {
      id: 2,
      midi: 60,
      dueTime: NOW + 10 * HISTORY_WINDOW_MS,
      status: 'pending',
    }
    const { ceiling, floor } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [future],
      NOW,
      TEST_GAP,
    )

    for (const rect of [ceiling, floor]) {
      expect(rect.x).toBe(geom.chartLeftX)
      expect(rect.width).toBe(geom.chartRightX - geom.chartLeftX)
    }
  })

  test('rightmost pillar mid-entry (past chartRightX) → wall follows its far edge, no air gap', () => {
    /* A pillar that has entered far enough to be drawn (centerX <=
     * chartRightX + PIPE_WIDTH) but whose column still pokes past chartRightX.
     * Regression: the wall used to clamp to chartRightX here, leaving a strip
     * of empty sky between the on-top ceiling/floor band and the pillar. */
    const targetCenterX = geom.chartRightX + 8
    /* Invert timeToX for this centerX (same algebra as dueTimeAtPickup). */
    const ratio =
      (targetCenterX - geom.nowEdgeX) / (geom.labelAxisX - geom.nowEdgeX)
    const entering: GameTarget = {
      id: 4,
      midi: 60,
      dueTime: NOW - ratio * HISTORY_WINDOW_MS,
      status: 'pending',
    }
    const { ceiling, floor } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [entering],
      NOW,
      TEST_GAP,
    )

    for (const rect of [ceiling, floor]) {
      expect(rect.x).toBe(geom.chartLeftX)
      /* Flush with the pillar's true far edge — NOT clamped to chartRightX. */
      expect(rect.x + rect.width).toBeCloseTo(targetCenterX + PIPE_WIDTH / 2)
      expect(rect.x + rect.width).toBeGreaterThan(geom.chartRightX)
    }
    expect(ceiling.width).toBe(floor.width)
  })

  test('pillar mid-exit (past chartLeftX) → wall extends left to back it, no air gap', () => {
    /* A pillar exiting left, still drawn (centerX >= chartLeftX - PIPE_WIDTH)
     * but whose column pokes past chartLeftX. Regression: the wall used to
     * hard-anchor at chartLeftX, leaving a strip of empty sky between the
     * on-top ceiling/floor band and the exiting pillar — "the gap at the
     * start". */
    const targetCenterX = geom.chartLeftX - 8
    const ratio =
      (targetCenterX - geom.nowEdgeX) / (geom.labelAxisX - geom.nowEdgeX)
    const exiting: GameTarget = {
      id: 5,
      midi: 60,
      dueTime: NOW - ratio * HISTORY_WINDOW_MS,
      status: 'hit',
    }
    const { ceiling, floor } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [exiting],
      NOW,
      TEST_GAP,
    )

    for (const rect of [ceiling, floor]) {
      /* Wall extends left to the pillar's true near edge — NOT clamped to
       * chartLeftX. */
      expect(rect.x).toBeCloseTo(targetCenterX - PIPE_WIDTH / 2)
      expect(rect.x).toBeLessThan(geom.chartLeftX)
    }
    expect(ceiling.width).toBe(floor.width)
  })

  test('game over: off-screen "missed" pillar does not clamp the wall off the rightmost drawn one', () => {
    /* The frozen game-over frame: stopGame bulk-marks un-reached pillars
     * 'missed'; their dueTime is far in the future vs the frozen now, so their
     * centerX is huge (off-screen right). Regression: that off-screen pillar
     * used to drag maxCenterX huge and clamp the wall back to chartRightX,
     * exposing the rightmost DRAWN pillar poking past it. The span must ignore
     * undrawn pillars. */
    const drawnCenterX = geom.chartRightX + 8
    const drawnRatio =
      (drawnCenterX - geom.nowEdgeX) / (geom.labelAxisX - geom.nowEdgeX)
    const drawnRightmost: GameTarget = {
      id: 6,
      midi: 60,
      dueTime: NOW - drawnRatio * HISTORY_WINDOW_MS,
      status: 'crashed',
    }
    const offScreenMissed: GameTarget = {
      id: 7,
      midi: 60,
      dueTime: NOW + 10 * HISTORY_WINDOW_MS,
      status: 'missed',
    }
    const { ceiling, floor } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [drawnRightmost, offScreenMissed],
      NOW,
      TEST_GAP,
    )

    for (const rect of [ceiling, floor]) {
      /* Flush with the drawn pillar's far edge — the off-screen 'missed'
       * pillar does NOT clamp it back to chartRightX. */
      expect(rect.x + rect.width).toBeCloseTo(drawnCenterX + PIPE_WIDTH / 2)
      expect(rect.x + rect.width).toBeGreaterThan(geom.chartRightX)
    }
    expect(ceiling.width).toBe(floor.width)
  })

  test('multiple pillars: extends to the rightmost (last) one', () => {
    /* dueTime === NOW → age 0 → centerX at the live edge (nowEdgeX), the
     * rightmost on-screen column. */
    const atLiveEdge: GameTarget = {
      id: 3,
      midi: 60,
      dueTime: NOW,
      status: 'pending',
    }
    const { ceiling } = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [pillarAtPickup, atLiveEdge],
      NOW,
      TEST_GAP,
    )

    expect(ceiling.x).toBe(geom.chartLeftX)
    expect(ceiling.x + ceiling.width).toBeCloseTo(
      geom.nowEdgeX + PIPE_WIDTH / 2,
    )
  })
})

describe('buildPlayfield (single field source for fill + hitbox)', () => {
  const width = 700
  const height = 320
  const midiMin = 48
  const midiMax = 72
  const geom = computeGeometry(width, false)

  function field(
    targets: GameTarget[],
    boundaryCrash: 'floor' | 'ceiling' | null = null,
  ) {
    return buildPlayfield({
      geom,
      now: NOW,
      targets,
      height,
      midiMin,
      midiMax,
      gapHalfSemitones: TEST_GAP,
      boundaryCrash,
    })
  }

  const pillarAtPickup: GameTarget = {
    id: 1,
    midi: 60,
    dueTime: dueTimeAtPickup(width, false, NOW),
    status: 'pending',
  }

  test('ceiling/floor are exactly the canonical getBoundaryRects (one span source)', () => {
    const f = field([pillarAtPickup])
    const boundary = getBoundaryRects(
      geom,
      height,
      midiMin,
      midiMax,
      [pillarAtPickup],
      NOW,
      TEST_GAP,
    )

    expect(f.ceiling).toEqual(boundary.ceiling)
    expect(f.floor).toEqual(boundary.floor)
  })

  test('no targets → only ceiling+floor in solids, full-width, no pipes', () => {
    const f = field([])

    expect(f.pipes).toHaveLength(0)
    expect(f.solids).toEqual([f.ceiling, f.floor])
    expect(f.crashed).toEqual([])
    for (const rect of [f.ceiling, f.floor]) {
      expect(rect.x).toBe(geom.chartLeftX)
      expect(rect.width).toBe(geom.chartRightX - geom.chartLeftX)
    }
  })

  test('solids contains ceiling, floor and every drawn pillar segment', () => {
    const f = field([pillarAtPickup])

    expect(f.pipes).toHaveLength(1)
    expect(f.solids).toContain(f.ceiling)
    expect(f.solids).toContain(f.floor)
    expect(f.solids).toContain(f.pipes[0].top)
    expect(f.solids).toContain(f.pipes[0].bottom)
    for (const rect of f.solids) {
      expect(rect.width).toBeGreaterThan(0)
      expect(rect.height).toBeGreaterThan(0)
    }
  })

  test('game over: off-screen "missed" pillar is excluded from pipes and span', () => {
    const drawnCenterX = geom.chartRightX + 8
    const ratio =
      (drawnCenterX - geom.nowEdgeX) / (geom.labelAxisX - geom.nowEdgeX)
    const drawnRightmost: GameTarget = {
      id: 6,
      midi: 60,
      dueTime: NOW - ratio * HISTORY_WINDOW_MS,
      status: 'crashed',
    }
    const offScreenMissed: GameTarget = {
      id: 7,
      midi: 60,
      dueTime: NOW + 10 * HISTORY_WINDOW_MS,
      status: 'missed',
    }
    const f = field([drawnRightmost, offScreenMissed])

    expect(f.pipes.map((pipe) => pipe.id)).toEqual([6])
    for (const rect of [f.ceiling, f.floor]) {
      expect(rect.x + rect.width).toBeCloseTo(drawnCenterX + PIPE_WIDTH / 2)
      expect(rect.x + rect.width).toBeGreaterThan(geom.chartRightX)
    }
  })

  test('pillar mid-exit past chartLeftX → wall extends left to back it', () => {
    const exitCenterX = geom.chartLeftX - 8
    const ratio =
      (exitCenterX - geom.nowEdgeX) / (geom.labelAxisX - geom.nowEdgeX)
    const exiting: GameTarget = {
      id: 8,
      midi: 60,
      dueTime: NOW - ratio * HISTORY_WINDOW_MS,
      status: 'hit',
    }
    const f = field([exiting])

    for (const rect of [f.ceiling, f.floor]) {
      expect(rect.x).toBeCloseTo(exitCenterX - PIPE_WIDTH / 2)
      expect(rect.x).toBeLessThan(geom.chartLeftX)
    }
  })

  test('crashed = only the crashed pillar column, clipped to the play area (wall stays green)', () => {
    const crashedPillar: GameTarget = {
      id: 9,
      midi: 60,
      dueTime: dueTimeAtPickup(width, false, NOW),
      status: 'crashed',
    }
    const greenPillar: GameTarget = {
      id: 10,
      midi: 60,
      dueTime: NOW,
      status: 'pending',
    }
    const f = field([crashedPillar, greenPillar])
    const crashedDrawn = f.pipes.find((pipe) => pipe.id === 9)!
    /* Inner edges of the wall band — derived from the ceiling/floor rects so
     * the test needs no internal geometry. */
    const playTop = f.ceiling.y + f.ceiling.height
    const playBottom = f.floor.y

    /* Two slices (top + bottom column), same column as the crashed pillar. */
    expect(f.crashed).toHaveLength(2)
    for (const rect of f.crashed) {
      expect(rect.x).toBe(crashedDrawn.top.x)
      expect(rect.width).toBe(crashedDrawn.top.width)
      expect(rect.height).toBeGreaterThan(0)
      /* The red never enters the ceiling/floor band, so the green wall there
       * is left untouched. */
      expect(rect.y).toBeGreaterThanOrEqual(playTop - 1e-9)
      expect(rect.y + rect.height).toBeLessThanOrEqual(playBottom + 1e-9)
    }
    /* The green pillar contributes nothing red. */
    const greenDrawn = f.pipes.find((pipe) => pipe.id === 10)!
    expect(f.crashed).not.toContainEqual(greenDrawn.top)
    expect(f.crashed).not.toContainEqual(greenDrawn.bottom)
  })

  test('boundaryCrash recolors only the side the bird died against', () => {
    const floorCrash = field([pillarAtPickup], 'floor')
    expect(floorCrash.crashed).toContain(floorCrash.floor)
    expect(floorCrash.crashed).not.toContain(floorCrash.ceiling)

    const ceilingCrash = field([pillarAtPickup], 'ceiling')
    expect(ceilingCrash.crashed).toContain(ceilingCrash.ceiling)
    expect(ceilingCrash.crashed).not.toContain(ceilingCrash.floor)

    expect(field([pillarAtPickup], null).crashed).toEqual([])
  })
})

describe('the D#3-vs-D3 regression (per-difficulty gap)', () => {
  const D3 = 50
  const Dsharp3 = 51
  const base = { width: 360, height: 256, midiMin: 36, midiMax: 84 } // worst case: small canvas, very wide range

  test('easy: 1 semitone off (D#3 vs D3) flies through and would score', () => {
    const gap = DIFFICULTY_GAP_HALF_SEMITONES.easy
    expect(isPitchInGap(Dsharp3, D3, gap)).toBe(true)
    expect(
      collidesAtPickup({
        ...base,
        targetMidi: D3,
        birdMidi: Dsharp3,
        gapHalfSemitones: gap,
      }),
    ).toBe(false)
  })

  test('easy: way off (3 semitones) still crashes', () => {
    const gap = DIFFICULTY_GAP_HALF_SEMITONES.easy
    expect(
      collidesAtPickup({
        ...base,
        targetMidi: D3,
        birdMidi: D3 + 3,
        gapHalfSemitones: gap,
      }),
    ).toBe(true)
  })

  test('hard: tolerance is tight — 2 semitones off crashes', () => {
    const gap = DIFFICULTY_GAP_HALF_SEMITONES.hard
    expect(
      collidesAtPickup({
        ...base,
        targetMidi: D3,
        birdMidi: D3 + 2,
        gapHalfSemitones: gap,
      }),
    ).toBe(true)
  })
})

describe('isBirdPositionFrozen', () => {
  const midiMin = 48
  const midiMax = 72

  test('inside the band and exactly at ±rangePad is movable (not frozen)', () => {
    expect(isBirdPositionFrozen(60, midiMin, midiMax, TEST_GAP)).toBe(false)
    expect(isBirdPositionFrozen(midiMax, midiMin, midiMax, TEST_GAP)).toBe(
      false,
    )
    /* Exactly ±pad still moves. */
    expect(
      isBirdPositionFrozen(midiMax + pad, midiMin, midiMax, TEST_GAP),
    ).toBe(false)
    expect(
      isBirdPositionFrozen(midiMin - pad, midiMin, midiMax, TEST_GAP),
    ).toBe(false)
  })

  test('more than rangePad out of range is frozen', () => {
    expect(
      isBirdPositionFrozen(midiMax + pad + 0.01, midiMin, midiMax, TEST_GAP),
    ).toBe(true)
    expect(
      isBirdPositionFrozen(midiMin - pad - 0.01, midiMin, midiMax, TEST_GAP),
    ).toBe(true)
    expect(isBirdPositionFrozen(midiMax + 20, midiMin, midiMax, TEST_GAP)).toBe(
      true,
    )
  })
})

describe('getBirdRect bird-position clamp', () => {
  const width = 700
  const height = 320
  const midiMin = 48
  const midiMax = 72
  const geom = computeGeometry(width, false)

  const birdY = (midi: number) =>
    getBirdRect(midi, geom, height, midiMin, midiMax, TEST_GAP).y

  test('frozen above: Y identical for every pitch past midiMax + rangePad', () => {
    const edge = birdY(midiMax + pad)
    expect(birdY(midiMax + pad + 3)).toBe(edge)
    expect(birdY(midiMax + 20)).toBe(edge)
  })

  test('frozen below: Y identical for every pitch past midiMin − rangePad', () => {
    const edge = birdY(midiMin - pad)
    expect(birdY(midiMin - pad - 5)).toBe(edge)
    expect(birdY(midiMin - 30)).toBe(edge)
  })

  test('inside the band the bird still moves (distinct Y from the edge)', () => {
    /* midiMax is below midiMax+pad in pitch → drawn lower → strictly larger y. */
    expect(birdY(midiMax)).toBeGreaterThan(birdY(midiMax + pad))
    expect(birdY(midiMin)).toBeLessThan(birdY(midiMin - pad))
  })
})

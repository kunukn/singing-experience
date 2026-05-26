import { describe, expect, test } from 'vitest'
import { createCrashGuard } from './singFlyCrashGuard'

const GRACE_MS = 100
/* ~60fps frame. 50ms fluke ≈ 3 of these. */
const FRAME_MS = 16

describe('createCrashGuard', () => {
  test('a ~50ms in-wall blip then clear never crashes (the fluke)', () => {
    const guard = createCrashGuard(GRACE_MS)

    /* ~48ms inside pipe 1, then the bird snaps back to safety. The reported
     * fluke: a near spike the median lets through for ~50ms. */
    expect(guard.update(1, FRAME_MS)).toBe(false)
    expect(guard.update(1, FRAME_MS)).toBe(false)
    expect(guard.update(1, FRAME_MS)).toBe(false)
    expect(guard.update(null, FRAME_MS)).toBe(false)

    /* No carry-over: re-entering still needs the FULL grace (the 48ms blip is
     * gone — 99ms fresh is under, 100ms fires). */
    expect(guard.update(1, 99)).toBe(false)
    expect(guard.update(1, 1)).toBe(true)
  })

  test('continuous overlap >= graceMs crashes', () => {
    const guard = createCrashGuard(GRACE_MS)

    let crashed = false
    let elapsed = 0
    /* Feed frames until grace is reached (7 × 16ms = 112ms). */
    for (let frame = 0; frame < 8; frame++) {
      crashed = guard.update(1, FRAME_MS)
      elapsed += FRAME_MS
      if (crashed) break
    }

    expect(crashed).toBe(true)
    expect(elapsed).toBeGreaterThanOrEqual(GRACE_MS)
  })

  test('boundary: returns true exactly when accumulated reaches graceMs', () => {
    const guard = createCrashGuard(GRACE_MS)

    expect(guard.update(1, 60)).toBe(false)
    expect(guard.update(1, 39)).toBe(false) // 99ms — still under
    expect(guard.update(1, 1)).toBe(true) // 100ms — fires
  })

  test('switching to a different wall mid-accumulation resets (no carry-over)', () => {
    const guard = createCrashGuard(GRACE_MS)

    expect(guard.update(1, 90)).toBe(false)
    /* Bird moved into a different pipe — its 90ms must not carry over. */
    expect(guard.update(2, 90)).toBe(false)
    expect(guard.update(2, 11)).toBe(true) // 101ms in pipe 2
  })

  test('clearing mid-accumulation resets; re-entry starts from zero', () => {
    const guard = createCrashGuard(GRACE_MS)

    expect(guard.update(1, 90)).toBe(false)
    expect(guard.update(null, FRAME_MS)).toBe(false)
    expect(guard.update(1, 90)).toBe(false) // not 90+90 → still under grace
    expect(guard.update(1, 11)).toBe(true)
  })

  test('reset() clears all state', () => {
    const guard = createCrashGuard(GRACE_MS)

    expect(guard.update(1, 99)).toBe(false)
    guard.reset()
    expect(guard.update(1, 99)).toBe(false) // would have crashed without reset
    expect(guard.update(1, 1)).toBe(true)
  })

  test('negative/NaN-safe: a non-positive delta does not advance', () => {
    const guard = createCrashGuard(GRACE_MS)

    expect(guard.update(1, -1000)).toBe(false)
    expect(guard.update(1, 0)).toBe(false)
    expect(guard.update(1, GRACE_MS)).toBe(true)
  })
})

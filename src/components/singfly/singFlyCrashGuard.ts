/* Crash debounce. The stabilized pitch can still carry a short
 * few-semitone microphone fluke (a near spike that the median lets through in
 * ~50ms). Collision must not end the round on such a blip, so the bird has to
 * stay *continuously* inside the same pipe wall for graceMs before it counts
 * as a real crash. Leaving the wall — or moving to a different pipe — resets
 * the accumulator, so only an uninterrupted off-pitch overlap is fatal. This
 * is the crash-side analogue of the scoring hold (HIT_STABILITY_MS). */

export type CrashGuard = {
  /* Feed every tick with the pipe the bird currently overlaps (null = clear)
   * and the elapsed ms since the previous tick. Returns true once the bird
   * has been continuously inside the SAME wall for >= graceMs. */
  update(hitWallId: number | null, deltaMs: number): boolean
  reset(): void
}

export function createCrashGuard(graceMs: number): CrashGuard {
  let heldId: number | null = null
  let heldMs = 0

  return {
    update(hitWallId, deltaMs) {
      if (hitWallId === null) {
        heldId = null
        heldMs = 0
        return false
      }

      if (hitWallId !== heldId) {
        heldId = hitWallId
        heldMs = 0
      }

      heldMs += Math.max(0, deltaMs)
      return heldMs >= graceMs
    },
    reset() {
      heldId = null
      heldMs = 0
    },
  }
}

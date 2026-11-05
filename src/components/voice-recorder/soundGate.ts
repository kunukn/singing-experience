import { percentile } from './takeStats'

/* Quietest level treated as sound, whatever the room's noise floor. */
const ABSOLUTE_FLOOR_DB = -50
/* Sound starts this far above the quietest 10% of frames... */
const NOISE_MARGIN_DB = 10
/* ...unless that would cut into the singing: a take with no silence has its
 * "noise floor" at the quiet end of the voice, and a whisper can sit about 30 dB
 * below a belt. */
const SINGING_RANGE_DB = 35

/* The level, from a take's frame levels, above which a frame counts as sound
 * rather than the room. Shared by analysis and silence trimming. */
export function findSoundGateDb(rmsDb: ArrayLike<number>): number {
  const quietEnd = percentile(rmsDb, 0.1)
  const loudEnd = percentile(rmsDb, 0.9)

  return Math.max(
    ABSOLUTE_FLOOR_DB,
    Math.min(quietEnd + NOISE_MARGIN_DB, loudEnd - SINGING_RANGE_DB),
  )
}

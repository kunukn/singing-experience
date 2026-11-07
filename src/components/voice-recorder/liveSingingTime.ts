import { ONSET_DEBOUNCE_MS } from '@/composables/usePitchDetection'

import { MAX_PITCH_HZ, MIN_CLARITY, MIN_PITCH_HZ } from './analyzeTake'
import { MIN_RATED_VOICED_MS } from './takeRating'

/*
 * The live count runs a little ahead of the analysis, which uses a longer window
 * and a sound gate fitted to the whole take. Waiting for this margin means
 * "ready" almost never ends in "not enough singing" after stopping.
 */
const READY_MARGIN_MS = 2000
export const LIVE_READY_MS = MIN_RATED_VOICED_MS + READY_MARGIN_MS

/* A throttled or hidden tab can skip frames; one long gap mustn't count as
 * seconds of singing. */
const MAX_FRAME_GAP_MS = 100

export type LiveFrame = {
  pitchHz: number
  clarity: number
  isSound: boolean
}

/*
 * Clear singing heard so far in a recording, by the same rules the take analysis
 * uses for its voiced time: fixed clarity, voice range, above the sound floor.
 *
 * Kept free of Vue and timers, so the timing can be tested with hand-written
 * timestamps.
 */
export function createClearSingingCounter() {
  let clearMs = 0
  let lastFrameMs: number | null = null
  let cleanSinceMs: number | null = null

  function push({ pitchHz, clarity, isSound }: LiveFrame, nowMs: number) {
    const gapMs =
      lastFrameMs === null ? 0 : Math.min(nowMs - lastFrameMs, MAX_FRAME_GAP_MS)
    lastFrameMs = nowMs

    const isClear =
      isSound &&
      clarity >= MIN_CLARITY &&
      pitchHz >= MIN_PITCH_HZ &&
      pitchHz <= MAX_PITCH_HZ

    if (!isClear) {
      cleanSinceMs = null

      return
    }

    /* A one-frame blip of pitch in a breath or a clap isn't singing. */
    cleanSinceMs ??= nowMs
    if (nowMs - cleanSinceMs >= ONSET_DEBOUNCE_MS) clearMs += gapMs
  }

  function reset() {
    clearMs = 0
    lastFrameMs = null
    cleanSinceMs = null
  }

  return {
    push,
    reset,
    get clearMs() {
      return clearMs
    },
  }
}

/* Whole seconds towards the rating's minimum, scaled so the count reaches it
 * exactly when the live count is ready: never "16 of 15" while not ready. */
export function displaySeconds(clearMs: number): number {
  const share = Math.min(1, clearMs / LIVE_READY_MS)

  return Math.floor((share * MIN_RATED_VOICED_MS) / 1000)
}

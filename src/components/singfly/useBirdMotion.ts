import type { Ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'
import {
  frequencyToMidi,
  frequencyToNote,
  midiToFrequency,
} from '@/utils/noteUtils'

import {
  BIRD_MOTION_BASE_RATE_SEMITONES_PER_S,
  BIRD_MOTION_MAX_DT_MS,
  BIRD_MOTION_TAU_MS,
  BIRD_MOTION_TRAVERSAL_MS,
} from './singFlyConstants'

type UseBirdMotionOptions = {
  /* The stabilizer's de-flickered output. A fresh object every detection frame
   * while the singer is active, null on silence. */
  noteInfo: Ref<NoteInfo | null>
  /* OUTPUT — the single bird position feeding BOTH the drawn bird and the
   * game's scoring/collision (SingFlyDisplay passes the same ref to
   * useSingFly). This composable mutates it; nobody else does. */
  smoothNoteInfo: Ref<NoteInfo | null>
  isPlaying: Ref<boolean>
  /* Where the bird perches before/at Start: the midpoint of the range. */
  perchMidi: Ref<number>
  /* Test-page manual clock: no internal RAF, time comes from the scrub
   * (gameStartTime + elapsedMs) so the motion stays deterministic. */
  manualClock: Ref<boolean>
  gameStartTime: Ref<number | null>
  elapsedMs: Ref<number>
}

/**
 * Pitch bird — the stage after useStablePitch. SingFly is a pure tone→height
 * game (no gravity): the bird's height is the sung pitch, nothing else.
 *
 * - a sung pitch (SingFly's forgiving SINGFLY_CLARITY_THRESHOLD gate keeps
 *   soft singing but rejects breath/room tone): travel
 *   toward it in roughly constant time (exponential ease, time-constant
 *   BIRD_MOTION_TAU_MS, capped by a distance-aware rate so any interval —
 *   small or an octave — lands in ~BIRD_MOTION_TRAVERSAL_MS, never
 *   teleporting), up or down;
 * - no pitch (true silence / a detector frame with no usable pitch): HOLD the
 *   last position. The bird never free-falls — a round ends only by singing
 *   off-pitch into a pipe wall / out of range, or when every pipe has scrolled
 *   past (resolved).
 *
 * The emitted NoteInfo is the single value driving both the drawn bird and
 * collision/scoring, so "what you see is what you hit" holds. dt is clamped
 * (BIRD_MOTION_MAX_DT_MS) so a RAF stall can't turn the speed cap into one
 * huge teleporting step. Real-time play uses an internal RAF; the manual-clock
 * test page integrates against the virtual scrub clock instead.
 */
export function useBirdMotion(options: UseBirdMotionOptions) {
  let displayMidi: number | null = null
  let lastTime: number | null = null

  let rafId: number | null = null

  function resolveNow(): number {
    return options.manualClock.value && options.gameStartTime.value !== null
      ? options.gameStartTime.value + options.elapsedMs.value
      : performance.now()
  }

  function emit() {
    if (displayMidi === null) return

    options.smoothNoteInfo.value = frequencyToNote(midiToFrequency(displayMidi))
  }

  function sungMidi(): number | null {
    const info = options.noteInfo.value
    if (!info || info.frequency <= 0) return null

    return frequencyToMidi(info.frequency)
  }

  function integrate(now: number) {
    if (!options.isPlaying.value) return

    /* Round start (or first tick): snap to the perch so the bird has a
     * sensible neutral height until the singer's first note moves it. */
    if (displayMidi === null || lastTime === null) {
      displayMidi = options.perchMidi.value
      lastTime = now
      emit()
      return
    }

    const dt = Math.min(Math.max(0, now - lastTime), BIRD_MOTION_MAX_DT_MS)
    lastTime = now

    const target = sungMidi()
    if (target !== null) {
      /* Travel toward the sung note. The speed cap is distance-aware:
       * max(BASE_RATE, |diff| / TRAVERSAL_S) so a big confirmed leap crosses in
       * ~BIRD_MOTION_TRAVERSAL_MS while small moves stay on the gentle BASE-rate
       * TAU ease. eased keeps diff's sign and |eased| <= |diff|, and clamping to
       * ±maxStep only shrinks it, so |step| <= |diff| — never overshoots, and
       * the dt clamp keeps any single step bounded so it never teleports. */
      const diff = target - displayMidi
      const eased = diff * (1 - Math.exp(-dt / BIRD_MOTION_TAU_MS))
      const effectiveRate = Math.max(
        BIRD_MOTION_BASE_RATE_SEMITONES_PER_S,
        Math.abs(diff) / (BIRD_MOTION_TRAVERSAL_MS / 1000),
      )
      const maxStep = (effectiveRate * dt) / 1000
      displayMidi += Math.max(-maxStep, Math.min(maxStep, eased))
    }
    /* else: no usable pitch this frame — hold the last position (no gravity).
     * displayMidi is unchanged; emit() below re-publishes it so the bird stays
     * put and visible. */

    emit()
  }

  function startRaf() {
    if (rafId !== null) return

    const loop = () => {
      integrate(resolveNow())
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
  }

  function stopRaf() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  watch(
    options.isPlaying,
    (playing) => {
      if (playing) {
        /* Re-arm for the new round; integrate() snaps to the perch on its
         * first tick. */
        displayMidi = null
        lastTime = null
        if (!options.manualClock.value) {
          startRaf()
        } else {
          integrate(resolveNow())
        }
      } else {
        /* Round over: freeze the bird where it died/finished (the canvas keeps
         * the final frame) and stop the clock. displayMidi is intentionally
         * retained. */
        stopRaf()
      }
    },
    { immediate: true },
  )

  /* Manual-clock test page: no RAF. The simulated detector still ticks
   * noteInfo on a real RAF while a note is held (drives the climb); the scrub
   * slider advances elapsedMs. Both integrate against the virtual clock so
   * scrubbing is deterministic. (No gravity now — silence simply holds.) */
  watch(
    () => [options.noteInfo.value, options.elapsedMs.value] as const,
    () => {
      if (!options.manualClock.value || !options.isPlaying.value) return

      integrate(resolveNow())
    },
  )

  /* Scope-based cleanup so the composable is usable outside a component
   * (e.g. unit tests) without an "onUnmounted has no instance" warning.
   * A component's setup() runs inside its own effect scope, so this still
   * cancels the RAF loop on unmount. failSilently: no-op when no scope. */
  onScopeDispose(stopRaf, true)

  /* Returned for parity with the old API / explicit re-init by tests. */
  function reset() {
    stopRaf()
    displayMidi = null
    lastTime = null
    options.smoothNoteInfo.value = null
  }

  return { reset }
}

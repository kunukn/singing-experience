import type { MaybeRefOrGetter } from 'vue'
import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { TUNER_IN_TUNE_CENTS } from './tunerConstants'

type TuningString = { note: NoteName; octave: number }

type InTuneBellOptions<TString extends TuningString> = {
  /* Every string of the current tuning */
  strings: MaybeRefOrGetter<readonly TString[]>
  /* The reading on screen — useBellHold's, so the bell's own sound can't
   * knock the string out of tune */
  noteInfo: MaybeRefOrGetter<NoteInfo | null>
  isClean: MaybeRefOrGetter<boolean>
  isListening: MaybeRefOrGetter<boolean>
  /* Ring the bell for this string; the caller owns the sound */
  onBell: (string: TString) => void
}

/*
 * Bell feedback guards:
 * - IN_TUNE_SUSTAIN_MS: pitch must hold steady for 500 ms before the bell fires,
 *   so transient wobbles into the TUNER_IN_TUNE_CENTS window don't trigger a ding.
 * - IN_TUNE_GRACE_MS: a string stays in tune through dropouts shorter than this,
 *   so one frame of background noise or detector jitter outside the window
 *   doesn't restart the sustain or blink the highlight.
 * - SAME_STRING_COOLDOWN_MS: suppresses repeat dings for the same string after
 *   the bell has fired; pitch detection at ~15-30×/sec would otherwise cause
 *   rapid-fire sounds as pitch drifts in/out of the window.
 * - TAP_BELL_MUTE_MS: suppresses the bell after the user taps a reference
 *   string button, since they will hear that tone directly.
 * Switching strings resets the sustain timer immediately.
 */
const IN_TUNE_SUSTAIN_MS = 500 // pitch must hold for 500 ms before bell fires
const HIGHLIGHT_DEBOUNCE_MS = 250 // matches Do Re Mi GRACE_PERIOD_MS — absorbs pitch jitter
const IN_TUNE_GRACE_MS = 250 // matches Do Re Mi GRACE_PERIOD_MS
const SAME_STRING_COOLDOWN_MS = 2000
const TAP_BELL_MUTE_MS = 3000 // suppress bell after tapping a reference string

function stringKey({ note, octave }: TuningString): string {
  return `${note}${octave}`
}

/**
 * When a tuner string counts as in tune: the bell that rings once it has held,
 * and the confirmed string the green ring is drawn on. Shared by the guitar
 * and ukulele tuners so their timing can't drift apart.
 */
export function useInTuneBell<TString extends TuningString>(
  options: InTuneBellOptions<TString>,
) {
  const confirmedInTuneString = shallowRef<TString | null>(null)
  /* inTuneString with IN_TUNE_GRACE_MS of slack on the way out — what the bell
   * and the highlight follow */
  const steadyInTuneString = shallowRef<TString | null>(null)

  let lastBellKey: string | null = null
  let lastBellTime = 0
  let lastTapTime = 0
  let pendingBellTimer: ReturnType<typeof setTimeout> | null = null
  let pendingBellKey: string | null = null
  let highlightTimer: ReturnType<typeof setTimeout> | null = null
  let highlightKey: string | null = null
  let inTuneGraceTimer: ReturnType<typeof setTimeout> | null = null

  const inTuneString = computed<TString | null>(() => {
    const noteInfo = toValue(options.noteInfo)
    if (!toValue(options.isListening) || !toValue(options.isClean)) return null

    if (!noteInfo || Math.abs(noteInfo.cents) > TUNER_IN_TUNE_CENTS) return null

    return (
      toValue(options.strings).find(
        (string) =>
          string.note === noteInfo.note && string.octave === noteInfo.octave,
      ) ?? null
    )
  })

  function clearPendingBell() {
    clearTimeout(pendingBellTimer ?? undefined)
    pendingBellTimer = null
    pendingBellKey = null
  }

  function clearHighlight() {
    clearTimeout(highlightTimer ?? undefined)
    highlightTimer = null
    highlightKey = null
    confirmedInTuneString.value = null
  }

  function clearSteadyInTuneString() {
    clearTimeout(inTuneGraceTimer ?? undefined)
    inTuneGraceTimer = null
    steadyInTuneString.value = null
  }

  watch(inTuneString, (current) => {
    if (current) {
      clearTimeout(inTuneGraceTimer ?? undefined)
      inTuneGraceTimer = null
      steadyInTuneString.value = current

      return
    }

    /* Stopping the mic is not a dropout — let go at once */
    if (!toValue(options.isListening)) {
      clearSteadyInTuneString()

      return
    }

    if (inTuneGraceTimer !== null || steadyInTuneString.value === null) return

    inTuneGraceTimer = setTimeout(() => {
      inTuneGraceTimer = null
      steadyInTuneString.value = null
    }, IN_TUNE_GRACE_MS)
  })

  watch(steadyInTuneString, (current) => {
    if (!current) {
      clearPendingBell()

      return
    }

    const key = stringKey(current)
    if (key === pendingBellKey) return // timer already running for this string

    clearTimeout(pendingBellTimer ?? undefined)
    pendingBellKey = key

    pendingBellTimer = setTimeout(() => {
      pendingBellTimer = null
      pendingBellKey = null

      const now = Date.now()
      if (now - lastTapTime < TAP_BELL_MUTE_MS) return

      if (key === lastBellKey && now - lastBellTime < SAME_STRING_COOLDOWN_MS)
        return

      lastBellKey = key
      lastBellTime = now
      options.onBell(current)
    }, IN_TUNE_SUSTAIN_MS)
  })

  watch(steadyInTuneString, (current) => {
    if (!current) {
      clearHighlight()

      return
    }

    const key = stringKey(current)
    if (key === highlightKey) return

    clearTimeout(highlightTimer ?? undefined)
    confirmedInTuneString.value = null
    highlightKey = key

    highlightTimer = setTimeout(() => {
      highlightTimer = null
      highlightKey = null
      confirmedInTuneString.value = current
    }, HIGHLIGHT_DEBOUNCE_MS)
  })

  /* A reference string was tapped — its tone must not ring the bell */
  function muteAfterTap() {
    lastTapTime = Date.now()
  }

  /* A new tuning: forget pending timers and the last bell */
  function reset() {
    clearSteadyInTuneString()
    clearPendingBell()
    clearHighlight()
    lastBellKey = null
    lastBellTime = 0
  }

  onScopeDispose(() => {
    clearSteadyInTuneString()
    clearPendingBell()
    clearHighlight()
  })

  return {
    confirmedInTuneString: readonly(confirmedInTuneString),
    muteAfterTap,
    reset,
  }
}

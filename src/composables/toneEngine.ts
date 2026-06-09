import { TONE_PLAY_DURATION_S } from '@/constants/toneConstants'
import { frequencyToNoteName } from '@/utils/noteUtils'
import type * as ToneType from 'tone'

export type ToneMode =
  | 'keyboard'
  | 'bell'
  | 'tuning'
  | 'tuning2'
  | 'bass'
  | 'square'

export type ToneEngine = {
  readonly toneMode: Readonly<Ref<ToneMode>>
  readonly isPlaying: Readonly<Ref<boolean>>
  warmUp: () => Promise<void>
  playTone: (frequencyHz: number, durationS?: number) => Promise<void>
  playToneAt: (frequencyHz: number, durationS: number, whenS: number) => void
  /* Schedules a short metronome click at a precise audio-clock time. `accent`
   * marks a bar downbeat (octave-higher, louder). Tone-mode independent. */
  playClickAt: (whenS: number, accent: boolean) => void
  playBellFeedback: (frequencyHz: number, durationS: number) => Promise<void>
  setToneMode: (mode: ToneMode) => void
  getNow: () => number
  scheduleDraw: (callback: () => void, whenS: number) => void
  cancelScheduled: (afterS?: number) => void
  /* (Re)builds a pool of `count` standalone monophonic voices for the current
   * tone mode, used to play multiple melodic lines together (Grace Kelly
   * harmony) with bounded polyphony — one voice per line instead of every note
   * stacking on a single shared PolySynth. */
  setHarmonyVoiceCount: (count: number) => void
  /* Schedules a note on harmony voice `voiceIndex` at a precise audio-clock
   * time. Caller must have awaited warmUp() and called setHarmonyVoiceCount(). */
  playHarmonyVoiceAt: (
    voiceIndex: number,
    frequencyHz: number,
    durationS: number,
    whenS: number,
  ) => void
}

/* Defers AudioContext creation until the first user gesture.
 * A static top-level import would create the AudioContext on page load,
 * which browsers block and warn about before a user gesture. */
let _tone: typeof ToneType | null = null

async function requireTone(): Promise<typeof ToneType> {
  if (!_tone) _tone = await import('tone')
  return _tone
}

/* Per-mode synth voice configs. Shared by the single shared PolySynth (manual /
 * single-line playback) and the standalone monophonic voices in the harmony
 * pool, so both paths sound identical. */

// dB — extra quiet; square waves are perceptually louder
const SQUARE_OPTIONS = {
  volume: -12,
  oscillator: { type: 'square' },
  // ADSR: snappy attack, moderate sustain — produces a retro chip-tune tone
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
} as const

const BELL_OPTIONS = {
  volume: -3, // dB — FM bell with sparse inharmonic partials reads quiet on Android speakers; lift it
  harmonicity: 5.1, // carrier:modulator ratio — non-integer for inharmonic bell overtones
  modulationIndex: 3, // FM depth — higher = brighter/richer partials
  oscillator: { type: 'sine' },
  // ADSR: near-instant attack, long decay/release for a ringing bell tail
  envelope: { attack: 0.001, decay: 1.0, sustain: 0.1, release: 1.5 },
  modulation: { type: 'square' },
  modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0.2, release: 0.5 },
} as const

const KEYBOARD_OPTIONS = {
  volume: -6, // dB — FM electric piano sits well around -6
  harmonicity: 1, // 1:1 carrier:modulator → integer overtones, piano-like
  modulationIndex: 8, // moderate FM depth — bell-tinged attack, not metallic
  oscillator: { type: 'sine' },
  // ADSR: snappy attack, medium decay, low sustain → Rhodes-like decay curve
  envelope: { attack: 0.005, decay: 1.2, sustain: 0.1, release: 0.8 },
  modulation: { type: 'sine' },
  // Modulation envelope drops fast → bell-like attack that fades into pure sine
  modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0, release: 0.4 },
} as const

const BASS_OPTIONS = {
  volume: -6, // dB — only slightly attenuated; bass needs presence
  oscillator: { type: 'square' },
  // Q 2 = mild resonance peak; -12 dB/oct rolloff for a warm low-end
  filter: { Q: 2, type: 'lowpass', rolloff: -12 },
  // ADSR: quick attack, high sustain for a full bass body
  envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.5 },
  /*
   * Filter envelope sweeps the cutoff from baseFrequency (100 Hz)
   * up by 2.5 octaves (~566 Hz) on each note, giving the bass
   * a brief "wah" brightness on attack that settles to warmth.
   */
  filterEnvelope: {
    attack: 0.04,
    decay: 0.2,
    sustain: 0.3,
    release: 0.5,
    baseFrequency: 100,
    octaves: 2.5,
  },
} as const

const TUNING_OPTIONS = {
  volume: -3, // dB — limiter downstream prevents clipping on stacked sines
  oscillator: { type: 'sine' },
  envelope: { attack: 0.01, decay: 0, sustain: 1.0, release: 0.1 },
} as const

const TUNING2_OPTIONS = {
  volume: 3, // dB — pure sines read quiet on mobile speakers (no harmonics to reproduce); +3 to overcome that
  oscillator: { type: 'sine' },
  envelope: { attack: 0.01, decay: 0, sustain: 1.0, release: 0.1 },
} as const

/**
 * Creates a Tone.js-backed audio engine that can play notes.
 * Lazily initialises each synth on
 * first use and exposes reactive playback state.
 */
export function createTonejsAdapter(): ToneEngine {
  const toneMode = ref<ToneMode>('keyboard')
  const isPlaying = ref(false)

  let toneStarted = false
  let warmUpPromise: Promise<void> | null = null
  let stopTimer: ReturnType<typeof setTimeout> | null = null
  let bellSynth: ToneType.PolySynth | null = null
  let keyboardSynth: ToneType.PolySynth | null = null
  let bassSynth: ToneType.MonoSynth | null = null
  let squareSynth: ToneType.PolySynth | null = null
  let tuningSynth: ToneType.PolySynth | null = null
  let tuningSynth2: ToneType.PolySynth | null = null
  /* Dedicated metronome click voice — independent of the selected tone mode so
   * the beat sounds the same whatever instrument is chosen. */
  let clickSynth: ToneType.Synth | null = null
  /* Harmony voice pool — one standalone monophonic synth per melodic line,
   * routed through a shared limiter. Built on demand by setHarmonyVoiceCount()
   * and disposed by cancelScheduled(). Keeps polyphony bounded to the number of
   * parts when several lines play together (Grace Kelly harmony). */
  let harmonyVoices: Array<
    ToneType.Synth | ToneType.FMSynth | ToneType.MonoSynth
  > = []
  let harmonyLimiter: ToneType.Limiter | null = null
  /*
   * Tracks the synth that played the most recent manual note (via playTone).
   * stopCurrent() releases it before the next manual note triggers, so quick
   * successive clicks cut the previous note instead of stacking polyphonically.
   * Scheduled sequence notes (playToneAt) deliberately do not assign this.
   */
  let lastTriggeredSynth: ToneType.PolySynth | ToneType.MonoSynth | null = null
  /* Latest audio-clock time at which a scheduled sequence note is still
   * audible. Used by cancelScheduled() to decide whether the synths need
   * to be disposed (the only reliable way to silence queued future
   * triggerAttackRelease calls in Tone.js). */
  let scheduledUntilS = 0

  /*
   * Best-effort recovery when the tab returns to foreground on iOS/Safari.
   * resume() may reject outside a user gesture — the catch swallows that and
   * the existing reactive guards still recover on the next button tap.
   */
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && _tone) {
        _tone
          .getContext()
          .resume()
          .catch(() => {})
      }
    })
  }

  /** Returns a square-wave polyphonic synth (lazy init). */
  function getSquareSynth(): ToneType.PolySynth {
    if (!squareSynth) {
      squareSynth = new _tone!.PolySynth(_tone!.Synth, SQUARE_OPTIONS)
      squareSynth.toDestination()
    }

    return squareSynth
  }

  /** Returns an FM-synthesis bell polyphonic synth (lazy init). */
  function getBellSynth(): ToneType.PolySynth {
    if (!bellSynth) {
      bellSynth = new _tone!.PolySynth(_tone!.FMSynth, BELL_OPTIONS)
      bellSynth.toDestination()
    }

    return bellSynth
  }

  /** Returns an FM electric-piano polyphonic synth (lazy init). Hz-accurate across C2–C7. */
  function getKeyboardSynth(): ToneType.PolySynth {
    if (!keyboardSynth) {
      keyboardSynth = new _tone!.PolySynth(_tone!.FMSynth, KEYBOARD_OPTIONS)
      keyboardSynth.toDestination()
    }

    return keyboardSynth
  }

  /** Returns a mono bass synth with a lowpass filter (lazy init). */
  function getBassSynth(): ToneType.MonoSynth {
    if (!bassSynth) {
      bassSynth = new _tone!.MonoSynth(BASS_OPTIONS)
      bassSynth.toDestination()
    }

    return bassSynth
  }

  /** Returns a pure-sine tuning-fork polyphonic synth (lazy init). */
  function getTuningSynth(): ToneType.PolySynth {
    if (!tuningSynth) {
      tuningSynth = new _tone!.PolySynth(_tone!.Synth, TUNING_OPTIONS)
      // -1 dB ceiling — catches peaks when multiple sine voices sum
      const limiter = new _tone!.Limiter(-1)
      tuningSynth.connect(limiter)
      limiter.toDestination()
    }

    return tuningSynth
  }

  /** Variant of the tuning-fork synth tuned louder for mobile speakers. */
  function getTuningSynth2(): ToneType.PolySynth {
    if (!tuningSynth2) {
      tuningSynth2 = new _tone!.PolySynth(_tone!.Synth, TUNING2_OPTIONS)
      // 0 dB ceiling — only catches polyphonic peaks, does not attenuate single voices
      const limiter = new _tone!.Limiter(0)
      tuningSynth2.connect(limiter)
      limiter.toDestination()
    }

    return tuningSynth2
  }

  /* Standalone monophonic voice matching a tone mode — same voice class and
   * options as the shared PolySynth above, but a single voice so each scheduled
   * note retriggers (and truncates) the previous note's tail. Used by the
   * harmony pool to keep total polyphony bounded to one voice per melodic line. */
  function createMonoVoice(
    mode: ToneMode,
  ): ToneType.Synth | ToneType.FMSynth | ToneType.MonoSynth {
    if (mode === 'bell') return new _tone!.FMSynth(BELL_OPTIONS)
    if (mode === 'keyboard') return new _tone!.FMSynth(KEYBOARD_OPTIONS)
    if (mode === 'bass') return new _tone!.MonoSynth(BASS_OPTIONS)
    if (mode === 'tuning') return new _tone!.Synth(TUNING_OPTIONS)
    if (mode === 'tuning2') return new _tone!.Synth(TUNING2_OPTIONS)

    return new _tone!.Synth(SQUARE_OPTIONS)
  }

  /** Starts the Tone.js audio context (requires user gesture) and preloads the active synth. */
  async function warmUp(): Promise<void> {
    const tone = await requireTone()

    /*
     * iOS/Safari and Android Chrome suspend the AudioContext when backgrounded.
     * iOS Safari additionally uses an 'interrupted' state (WebKit-only, beyond
     * the spec) after phone calls, Siri, or audio route changes. Treat anything
     * other than 'running' as needing a fresh Tone.start() on the next gesture.
     */
    if (tone.getContext().state !== 'running') {
      warmUpPromise = null
    }

    if (warmUpPromise) return warmUpPromise

    warmUpPromise = (async () => {
      await tone.start()
      toneStarted = true
      attachStateChangeListener()
    })()

    return warmUpPromise
  }

  let stateChangeAttached = false

  /*
   * Invalidate the cached warmUpPromise the moment the context leaves 'running'
   * so the next user-gesture-triggered warmUp() actually re-resumes, instead of
   * relying on the state happening to be checked at entry time.
   */
  function attachStateChangeListener() {
    if (stateChangeAttached || !_tone) return

    const ctx = _tone.getContext()
    ctx.on('statechange', () => {
      if (_tone && _tone.getContext().state !== 'running') {
        warmUpPromise = null
      }
    })
    stateChangeAttached = true
  }

  /** Cancels the auto-stop timer, releases any sustaining manual note, and marks playback as idle. */
  function stopCurrent() {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
    /*
     * Cut the previous manual note before the next one triggers. PolySynth
     * uses releaseAll(); MonoSynth only exposes triggerRelease(). Wrapped in
     * try/catch because release on an already-idle synth can throw on some
     * Tone.js builds and is harmless to ignore.
     */
    if (lastTriggeredSynth) {
      try {
        if ('releaseAll' in lastTriggeredSynth) {
          lastTriggeredSynth.releaseAll()
        } else {
          lastTriggeredSynth.triggerRelease()
        }
      } catch {
        /* noop */
      }
      lastTriggeredSynth = null
    }
    isPlaying.value = false
  }

  /** Plays a single note at the given frequency using the currently selected tone mode. */
  async function playTone(
    frequencyHz: number,
    durationS = TONE_PLAY_DURATION_S,
  ): Promise<void> {
    const tone = await requireTone()
    const t0 = performance.now()
    stopCurrent()

    const noteName = frequencyToNoteName(frequencyHz)
    if (!noteName) return

    if (!toneStarted || tone.getContext().state !== 'running') {
      const tStart = performance.now()
      await tone.start()
      toneStarted = true
      debugLog(
        `[TonePlayer] Tone.start(): ${(performance.now() - tStart).toFixed(1)}ms`,
      )
    }

    isPlaying.value = true

    triggerSynthForCurrentMode(noteName, durationS)
    debugLog(
      `[TonePlayer] ${toneMode.value} triggerAttackRelease(${noteName}): ${(performance.now() - t0).toFixed(1)}ms total`,
    )

    // Convert duration from seconds to milliseconds for setTimeout
    stopTimer = setTimeout(() => {
      isPlaying.value = false
      stopTimer = null
    }, durationS * 1000)
  }

  /** Returns the current synth based on the active tone mode. */
  function triggerSynthForCurrentMode(
    noteName: string,
    durationS: number,
    whenS?: number,
  ) {
    let synth: ToneType.PolySynth | ToneType.MonoSynth
    if (toneMode.value === 'bell') {
      synth = getBellSynth()
    } else if (toneMode.value === 'keyboard') {
      synth = getKeyboardSynth()
    } else if (toneMode.value === 'bass') {
      synth = getBassSynth()
    } else if (toneMode.value === 'tuning') {
      synth = getTuningSynth()
    } else if (toneMode.value === 'tuning2') {
      synth = getTuningSynth2()
    } else {
      synth = getSquareSynth()
    }

    synth.triggerAttackRelease(noteName, durationS, whenS)

    /*
     * Only track the synth for manual playback (whenS undefined). Scheduled
     * sequence notes via playToneAt must not register here, otherwise the
     * next manual click would prematurely cut a sequence in progress.
     */
    if (whenS === undefined) lastTriggeredSynth = synth
  }

  /** Schedules a tone at a precise audio-clock time. Caller must have awaited warmUp(). */
  function playToneAt(
    frequencyHz: number,
    durationS: number,
    whenS: number,
  ): void {
    if (!_tone) return

    const noteName = frequencyToNoteName(frequencyHz)
    if (!noteName) return

    triggerSynthForCurrentMode(noteName, durationS, whenS)

    /* Track the furthest-out scheduled note end so cancelScheduled() can tell
     * whether queued audio still needs to be silenced. */
    const endS = whenS + durationS
    if (endS > scheduledUntilS) scheduledUntilS = endS
  }

  /** Returns the dedicated metronome click synth (lazy init). */
  function getClickSynth(): ToneType.Synth {
    if (!clickSynth) {
      clickSynth = new _tone!.Synth({
        oscillator: { type: 'triangle' },
        /* Percussive tick: near-instant attack, fast decay, no sustain. */
        envelope: { attack: 0.001, decay: 0.03, sustain: 0, release: 0.01 },
        volume: -6, // dB — sits under the singer without masking it
      }).toDestination()
    }

    return clickSynth
  }

  /** Schedules a short metronome click at a precise audio-clock time. */
  function playClickAt(whenS: number, accent: boolean): void {
    if (!_tone) return

    const synth = getClickSynth()
    /* Accent (bar downbeat) rings an octave higher and louder than a plain beat. */
    const note = accent ? 'C7' : 'C6'
    const velocity = accent ? 1 : 0.6
    const durationS = 0.03 // 30 ms — a crisp tick, well under the shortest beat
    synth.triggerAttackRelease(note, durationS, whenS, velocity)

    const endS = whenS + durationS
    if (endS > scheduledUntilS) scheduledUntilS = endS
  }

  /** Disposes every harmony voice and the shared limiter, resetting the pool. */
  function disposeHarmonyVoices(): void {
    for (const voice of harmonyVoices) {
      try {
        voice.dispose()
      } catch {
        /* noop — disposing an already-disposed voice is harmless */
      }
    }
    harmonyVoices = []

    if (harmonyLimiter) {
      try {
        harmonyLimiter.dispose()
      } catch {
        /* noop */
      }
      harmonyLimiter = null
    }
  }

  /** (Re)builds a pool of `count` monophonic voices for the current tone mode. */
  function setHarmonyVoiceCount(count: number): void {
    if (!_tone) return

    disposeHarmonyVoices()

    // -1 dB ceiling — catches peaks when several voices sum, like the tuning bus
    harmonyLimiter = new _tone.Limiter(-1)
    harmonyLimiter.toDestination()

    for (let index = 0; index < count; index++) {
      const voice = createMonoVoice(toneMode.value)
      voice.connect(harmonyLimiter)
      harmonyVoices.push(voice)
    }
  }

  /** Schedules a note on harmony voice `voiceIndex` at a precise audio-clock time. */
  function playHarmonyVoiceAt(
    voiceIndex: number,
    frequencyHz: number,
    durationS: number,
    whenS: number,
  ): void {
    const voice = harmonyVoices[voiceIndex]
    if (!voice) return

    const noteName = frequencyToNoteName(frequencyHz)
    if (!noteName) return

    voice.triggerAttackRelease(noteName, durationS, whenS)

    /* Track the furthest-out scheduled note end so cancelScheduled() can tell
     * whether queued audio still needs to be silenced. */
    const endS = whenS + durationS
    if (endS > scheduledUntilS) scheduledUntilS = endS
  }

  /** Returns the current Tone.js audio-clock time in seconds. */
  function getNow(): number {
    return _tone ? _tone.now() : 0
  }

  /** Schedules a callback to fire at `whenS` (audio-clock seconds) inside Tone's draw loop. */
  function scheduleDraw(callback: () => void, whenS: number): void {
    if (!_tone) return

    _tone.getDraw().schedule(callback, whenS)
  }

  /** Cancels scheduled draw callbacks at or after `afterS` (audio-clock seconds)
   * and releases any in-flight or queued synth notes so a stopped sequence
   * goes silent immediately rather than continuing to play queued tones. */
  function cancelScheduled(afterS = 0): void {
    if (!_tone) return

    _tone.getDraw().cancel(afterS)

    /* Always tear down the harmony pool — it is cheap, and the early return
     * below would otherwise leak its voices on unmount after a natural finish. */
    disposeHarmonyVoices()

    /* No queued audio still pending — nothing to silence. */
    if (_tone.now() >= scheduledUntilS) return

    scheduledUntilS = 0

    /*
     * Dispose every initialized synth so any in-flight or queued
     * triggerAttackRelease events are silenced immediately. releaseAll() only
     * releases sustaining voices — scheduled-future attacks still fire — so
     * we drop the synths entirely and let getXxxSynth() lazily recreate them
     * on the next playback.
     */
    const disposeAndClear = (
      synth: ToneType.PolySynth | ToneType.MonoSynth | ToneType.Synth | null,
    ) => {
      if (!synth) return

      try {
        synth.dispose()
      } catch {
        /* noop — disposing an already-disposed synth is harmless */
      }
    }

    disposeAndClear(bellSynth)
    disposeAndClear(keyboardSynth)
    disposeAndClear(squareSynth)
    disposeAndClear(tuningSynth)
    disposeAndClear(tuningSynth2)
    disposeAndClear(bassSynth)
    disposeAndClear(clickSynth)
    bellSynth = null
    keyboardSynth = null
    squareSynth = null
    tuningSynth = null
    tuningSynth2 = null
    bassSynth = null
    clickSynth = null
    lastTriggeredSynth = null
    isPlaying.value = false
  }

  /* Plays a Bell tone at the given frequency without changing the current toneMode.
   * Used for UI feedback (e.g. tuner lock-on) that must always sound like a bell
   * regardless of what tone mode the user has selected. */
  async function playBellFeedback(
    frequencyHz: number,
    durationS: number,
    volumeDb?: number,
  ): Promise<void> {
    const tone = await requireTone()
    const noteName = frequencyToNoteName(frequencyHz)
    if (!noteName) return

    if (!toneStarted || tone.getContext().state !== 'running') {
      await tone.start()
      toneStarted = true
    }

    const synth = getBellSynth()
    const previousVolumeDb = synth.volume.value
    if (volumeDb !== undefined) synth.volume.value = volumeDb

    synth.triggerAttackRelease(noteName, durationS)

    if (volumeDb !== undefined) synth.volume.value = previousVolumeDb
  }

  function setToneMode(mode: ToneMode): void {
    toneMode.value = mode
  }

  return {
    toneMode: readonly(toneMode),
    isPlaying: readonly(isPlaying),
    warmUp,
    playTone,
    playToneAt,
    playClickAt,
    playBellFeedback,
    setToneMode,
    getNow,
    scheduleDraw,
    cancelScheduled,
    setHarmonyVoiceCount,
    playHarmonyVoiceAt,
  }
}

export const defaultToneEngine: ToneEngine = createTonejsAdapter()

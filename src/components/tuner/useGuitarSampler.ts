import { type NoteName } from '@/utils/noteUtils'
import type * as ToneType from 'tone'

/*
 * Module-level singletons — survive component re-mounts so samples are never
 * fetched twice. Two samplers split by usage:
 *  - standardSampler: the 6 standard EADGBE notes; eagerly prewarmed on mount.
 *  - extraSampler: the other 10 notes used by Drop D / Open G / Eb / Open D /
 *    DADGAD / Drop C / Open C; lazy — only loads when a non-standard tuning
 *    is actually played.
 */
let _tone: typeof ToneType | null = null
let standardSampler: ToneType.Sampler | null = null
let standardReady = false
let standardLoadPromise: Promise<void> | null = null
let extraSampler: ToneType.Sampler | null = null
let extraReady = false
let extraLoadPromise: Promise<void> | null = null
let activeC2Player: ToneType.Player | null = null

const GUITAR_RING_S = 3 // open string rings for ~3 seconds
const SAMPLER_VOLUME_DB = -6 // dB — reference level for all guitar samples
const C2_RING_S = 5
const C2_FADE_OUT_S = 0.3 // graceful tail on stop to avoid an audible click

/* Defers AudioContext creation until the first user gesture (play call).
 * A static top-level import would create the AudioContext on page load,
 * which browsers block and warn about before a user gesture. */
async function requireTone(): Promise<typeof ToneType> {
  if (!_tone) _tone = await import('tone')
  return _tone
}

/* Standard EADGBE samples — prewarmed on tuner mount so the first ♪ click is instant. */
const STANDARD_SAMPLE_URLS: Record<string, string> = {
  E2: 'E2.mp3',
  A2: 'A2.mp3',
  D3: 'D3.mp3',
  G3: 'G3.mp3',
  B3: 'B3.mp3',
  E4: 'E4.mp3',
}

/*
 * Samples for non-standard tunings. Sharp notes use 's' suffix in filenames
 * (e.g. Fs3.mp3 = F#3) but are keyed with '#' so Tone.js resolves them correctly.
 */
const EXTRA_SAMPLE_URLS: Record<string, string> = {
  'D#2': 'Ds2.mp3', // Eb standard string 6
  D2: 'D2.mp3',
  'G#2': 'Gs2.mp3', // Eb standard string 5
  G2: 'G2.mp3', // Open G string 5
  'C#3': 'Cs3.mp3', // Eb standard string 4
  'F#3': 'Fs3.mp3', // Open D string 3 / Eb standard string 3
  A3: 'A3.mp3', // DADGAD / Open D string 2
  'A#3': 'As3.mp3', // Eb standard string 2
  D4: 'D4.mp3', // DADGAD / Open G / Open D string 1
  'D#4': 'Ds4.mp3', // Eb standard string 1
}

const STANDARD_NOTE_KEYS = new Set(Object.keys(STANDARD_SAMPLE_URLS))

const SAMPLE_BASE_URL = `${import.meta.env.BASE_URL}sounds/guitar-acoustic/`

/* Safe to call only after requireTone() has resolved — _tone is guaranteed non-null. */
function getStandardSampler(): ToneType.Sampler {
  if (!standardSampler) {
    standardSampler = new _tone!.Sampler({
      urls: STANDARD_SAMPLE_URLS,
      baseUrl: SAMPLE_BASE_URL,
      volume: SAMPLER_VOLUME_DB,
      release: 1.5, // natural decay tail after release
      onload: () => {
        standardReady = true
      },
    })
    standardSampler.toDestination()
  }

  return standardSampler
}

function getExtraSampler(): ToneType.Sampler {
  if (!extraSampler) {
    extraSampler = new _tone!.Sampler({
      urls: EXTRA_SAMPLE_URLS,
      baseUrl: SAMPLE_BASE_URL,
      volume: SAMPLER_VOLUME_DB,
      release: 1.5,
      onload: () => {
        extraReady = true
      },
    })
    extraSampler.toDestination()
  }

  return extraSampler
}

function loadStandard(): Promise<void> {
  if (standardLoadPromise) return standardLoadPromise

  const s = getStandardSampler()

  if (standardReady) {
    standardLoadPromise = Promise.resolve()

    return standardLoadPromise
  }

  standardLoadPromise = new Promise<void>((resolve) => {
    const check = () => {
      if (standardReady) resolve()
      else setTimeout(check, 50) // poll until sampler finishes decoding
    }

    if (s.loaded) {
      standardReady = true
      resolve()
    } else {
      check()
    }
  })

  return standardLoadPromise
}

function loadExtra(): Promise<void> {
  if (extraLoadPromise) return extraLoadPromise

  const s = getExtraSampler()

  if (extraReady) {
    extraLoadPromise = Promise.resolve()

    return extraLoadPromise
  }

  extraLoadPromise = new Promise<void>((resolve) => {
    const check = () => {
      if (extraReady) resolve()
      else setTimeout(check, 50)
    }

    if (s.loaded) {
      extraReady = true
      resolve()
    } else {
      check()
    }
  })

  return extraLoadPromise
}

/* Eagerly fetch + decode the 6 standard EADGBE samples. Safe to call before a
 * user gesture: the AudioContext is created suspended; only triggerAttackRelease
 * later needs it running. */
export async function prewarmStandardTuning(): Promise<void> {
  await requireTone()
  await loadStandard()
}

export function useGuitarSampler() {
  const isPlaying = ref(false)
  let stopTimer: ReturnType<typeof setTimeout> | null = null

  /* Pre-load every sampler/buffer needed for `strings` so a subsequent
   * `playAt()` can run synchronously inside an audio-clock schedule. */
  async function prepare(strings: { note: NoteName; octave: number }[]) {
    await requireTone()

    let needsStandard = false
    let needsExtra = false
    let needsC2 = false
    for (const s of strings) {
      const key = `${s.note}${s.octave}`
      if (s.note === 'C' && s.octave === 2) needsC2 = true
      else if (STANDARD_NOTE_KEYS.has(key)) needsStandard = true
      else needsExtra = true
    }

    /* C2 uses a Tone.Player on D2.mp3 — D2 lives in the extra bank. */
    if (needsC2) needsExtra = true

    const tasks: Promise<void>[] = []
    if (needsStandard) tasks.push(loadStandard())
    if (needsExtra) tasks.push(loadExtra())
    await Promise.all(tasks)

    if (needsC2) await _tone!.loaded()
  }

  /* Schedule a sample at audio-clock time `whenS`. Caller must have awaited
   * `prepare()` for these notes — this is a synchronous scheduling call so it
   * can sit alongside `engine.scheduleDraw()` for sample-accurate UI sync. */
  function playAt(
    note: NoteName,
    octave: number,
    whenS: number,
    duration: number = GUITAR_RING_S,
  ): void {
    if (!_tone) return

    if (note === 'C' && octave === 2) {
      if (activeC2Player) {
        activeC2Player.stop()
        activeC2Player.dispose()
        activeC2Player = null
      }
      const d2Url = `${SAMPLE_BASE_URL}D2.mp3`
      const player = new _tone.Player({
        url: d2Url,
        fadeOut: C2_FADE_OUT_S,
      }).toDestination()
      // 2^(-2/12) ≈ 0.891 — slows playback by 2 semitones, shifting D2 (73.42 Hz) down to C2 (65.41 Hz)
      player.playbackRate = 2 ** (-2 / 12)
      player.start(whenS)
      player.stop(whenS + C2_RING_S)
      activeC2Player = player
      return
    }

    const key = `${note}${octave}`
    const useStandard = STANDARD_NOTE_KEYS.has(key)
    const sampler = useStandard ? getStandardSampler() : getExtraSampler()

    sampler.volume.value = SAMPLER_VOLUME_DB
    sampler.triggerAttackRelease(key, duration, whenS)
  }

  function stop(): void {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
    /* Instant mute on both samplers; restored in play() before each attack. */
    if (standardSampler) standardSampler.volume.value = -Infinity
    if (extraSampler) extraSampler.volume.value = -Infinity
    if (activeC2Player) {
      activeC2Player.stop()
      activeC2Player.dispose()
      activeC2Player = null
    }
    isPlaying.value = false
  }

  async function play(
    note: NoteName,
    octave: number,
    duration: number = GUITAR_RING_S,
  ): Promise<void> {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }

    const tone = await requireTone()
    if (tone.getContext().state === 'suspended') await tone.start()

    // No C2 sample exists; pitch-shift D2 down 2 semitones via a raw Player
    if (note === 'C' && octave === 2) {
      if (activeC2Player) {
        activeC2Player.stop()
        activeC2Player.dispose()
        activeC2Player = null
      }
      const d2Url = `${SAMPLE_BASE_URL}D2.mp3`
      const player = new tone.Player({
        url: d2Url,
        fadeOut: C2_FADE_OUT_S,
      }).toDestination()
      // 2^(-2/12) ≈ 0.891 — slows playback by 2 semitones, shifting D2 (73.42 Hz) down to C2 (65.41 Hz)
      player.playbackRate = 2 ** (-2 / 12)
      await tone.loaded()
      player.start()
      // Schedule stop — Player has no built-in duration; without this it plays D2.mp3 to the end at 0.891x (longer than the file)
      player.stop(`+${C2_RING_S}`)
      activeC2Player = player
      isPlaying.value = true
      stopTimer = setTimeout(() => {
        isPlaying.value = false
        stopTimer = null
        if (activeC2Player === player) {
          player.dispose()
          activeC2Player = null
        }
      }, C2_RING_S * 1000)
      return
    }

    const key = `${note}${octave}`
    const useStandard = STANDARD_NOTE_KEYS.has(key)
    const sampler = useStandard ? getStandardSampler() : getExtraSampler()
    const ready = useStandard ? standardReady : extraReady

    if (!ready) await (useStandard ? loadStandard() : loadExtra())

    sampler.volume.value = SAMPLER_VOLUME_DB // restore after any prior stop()
    sampler.triggerAttackRelease(key, duration)
    isPlaying.value = true
    stopTimer = setTimeout(() => {
      isPlaying.value = false
      stopTimer = null
    }, duration * 1000)
  }

  return { play, playAt, prepare, stop, isPlaying: readonly(isPlaying) }
}

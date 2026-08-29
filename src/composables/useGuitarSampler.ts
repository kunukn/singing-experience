import { type NoteName } from '@/utils/noteUtils'
import type * as ToneType from 'tone'

/*
 * Module-level singletons — survive component re-mounts so samples are never
 * fetched twice. Two samplers split by usage:
 *  - standardSampler: the 6 standard EADGBE notes; eagerly prewarmed on mount.
 *  - extraSampler: every other sample — the open strings of Drop D / Open G / Eb /
 *    Open D / DADGAD / Drop C / Open C, plus the upper register the fretboard
 *    reaches. Lazy for the tuner (loads only when a non-standard tuning plays);
 *    the fretboard prewarms it, since any fret can be pressed first.
 */
let _tone: typeof ToneType | null = null
let standardSampler: ToneType.Sampler | null = null
let standardReady = false
let standardLoadPromise: Promise<void> | null = null
let extraSampler: ToneType.Sampler | null = null
let extraReady = false
let extraLoadPromise: Promise<void> | null = null

const GUITAR_RING_S = 3 // open string rings for ~3 seconds
const SAMPLER_VOLUME_DB = -6 // dB — reference level for all guitar samples

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
  /*
   * Drop C / Open C string 6. GENERATED, not recorded — D2.mp3 resampled down
   * two semitones with ffmpeg, which is precisely what a Tone.Player used to do
   * to it at playback time, so it sounds the same as it always did.
   *
   * Baking it into a file is what removed that Player: building one per press
   * meant starting it before its buffer had fetched, which threw and took the
   * whole tuner strum down with it, and it bypassed the sampler's -6 dB
   * reference level so C2 rang louder than every other string.
   */
  C2: 'C2.mp3',
  /*
   * Not open-string notes for any tuning. These are reference points for the
   * resampler above the open strings: every fretted note routes to this bank
   * (see STANDARD_NOTE_KEYS below), and Tone picks the nearest key and shifts
   * from it, so a bare neck of open-string samples would stretch the whole
   * upper register up from D#4.
   *
   * G#4 is the highest REAL recording here. Everything above it is generated —
   * there is no source material further up to go looking for.
   *
   * The two above it exist because Tone extrapolates upward off the topmost key
   * with nothing bracketing it, and the board's top note is a long way past
   * G#4: at 22 frets it is D6 (MIDI 86), since no tuning puts string 1 above
   * E4. Left to G#4 alone that is eighteen semitones up, played at 2.8x — a
   * chirp, not a guitar.
   *
   *   samples in the bank   D6 stretches
   *   G#4                   +18 st
   *   + C5                  +14 st
   *   + G#5                  +6 st   ← where we are
   *
   * C5.mp3 was shifted up four semitones from Gs4.mp3, for the 19-fret board.
   * Gs5.mp3 came with the 22nd fret, shifted a whole octave — an exact 2x
   * ratio, and taken from the real Gs4.mp3 rather than from the already
   * synthetic C5, so it does not compound one resampling with another. Both use
   * ffmpeg asetrate + atempo, which keeps the decay its original length instead
   * of halving it the way a bare rate change would:
   *
   *   ffmpeg -i Gs4.mp3 -filter:a \
   *     "asetrate=44100*2,aresample=44100,atempo=0.5" -ac 1 -b:a 192k Gs5.mp3
   */
  C4: 'C4.mp3',
  G4: 'G4.mp3',
  'G#4': 'Gs4.mp3',
  C5: 'C5.mp3',
  'G#5': 'Gs5.mp3',
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

/*
 * Both banks up front, for the fretboard: it can sound any of its 120 cells, not
 * just six open strings, so there is no useful subset to load lazily and a
 * first press would otherwise wait on the fetch. Same gesture safety as above —
 * the AudioContext is created suspended.
 */
export async function prewarmGuitarFretboard(): Promise<void> {
  await requireTone()
  await Promise.all([loadStandard(), loadExtra()])
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
    for (const s of strings) {
      if (STANDARD_NOTE_KEYS.has(`${s.note}${s.octave}`)) needsStandard = true
      else needsExtra = true
    }

    const tasks: Promise<void>[] = []
    if (needsStandard) tasks.push(loadStandard())
    if (needsExtra) tasks.push(loadExtra())
    await Promise.all(tasks)
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

import { type NoteName } from '@/utils/noteUtils'
import type * as ToneType from 'tone'

/*
 * Module-level singleton — survives component re-mounts so samples are never
 * fetched twice. Lazy: nothing loads until the first play() call.
 */
let _tone: typeof ToneType | null = null
let sampler: ToneType.Sampler | null = null
let samplerReady = false
let loadPromise: Promise<void> | null = null

const UKULELE_RING_S = 3 // open string rings for ~3 seconds
const SAMPLER_VOLUME_DB = -6 // dB — reference level for all ukulele samples

/* Defers AudioContext creation until the first user gesture (play call).
 * A static top-level import would create the AudioContext on page load,
 * which browsers block and warn about before a user gesture. */
async function requireTone(): Promise<typeof ToneType> {
  if (!_tone) _tone = await import('tone')
  return _tone
}

/* Samples cover both Low G (G3) and High G (G4) tunings. */
const SAMPLE_URLS: Record<string, string> = {
  G3: 'G3.mp3', // Low G tuning
  G4: 'G4.mp3', // High G tuning
  C4: 'C4.mp3',
  E4: 'E4.mp3',
  A4: 'A4.mp3',
}

/* Safe to call only after requireTone() has resolved — _tone is guaranteed non-null. */
function getSampler(): ToneType.Sampler {
  if (!sampler) {
    sampler = new _tone!.Sampler({
      urls: SAMPLE_URLS,
      baseUrl: `${import.meta.env.BASE_URL}sounds/ukulele/`,
      volume: SAMPLER_VOLUME_DB,
      release: 1.5, // natural decay tail after release
      onload: () => {
        samplerReady = true
      },
    })
    sampler.toDestination()
  }

  return sampler
}

function load(): Promise<void> {
  if (loadPromise) return loadPromise

  const s = getSampler()

  if (samplerReady) {
    loadPromise = Promise.resolve()

    return loadPromise
  }

  loadPromise = new Promise<void>((resolve) => {
    const check = () => {
      if (samplerReady) resolve()
      else setTimeout(check, 50) // poll until sampler finishes decoding
    }

    if (s.loaded) {
      samplerReady = true
      resolve()
    } else {
      check()
    }
  })

  return loadPromise
}

export function useUkuleleSampler() {
  const isPlaying = ref(false)
  let stopTimer: ReturnType<typeof setTimeout> | null = null

  function stop(): void {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
    if (sampler) sampler.volume.value = -Infinity // instant mute; restored in play()
    isPlaying.value = false
  }

  async function play(note: NoteName, octave: number): Promise<void> {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }

    const tone = await requireTone()
    if (tone.getContext().state === 'suspended') await tone.start()

    if (!samplerReady) await load()

    getSampler().volume.value = SAMPLER_VOLUME_DB // restore after any prior stop()
    getSampler().triggerAttackRelease(`${note}${octave}`, UKULELE_RING_S)
    isPlaying.value = true
    stopTimer = setTimeout(() => {
      isPlaying.value = false
      stopTimer = null
    }, UKULELE_RING_S * 1000)
  }

  return { play, stop, isPlaying: readonly(isPlaying) }
}

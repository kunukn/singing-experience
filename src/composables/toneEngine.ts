import { frequencyToNoteName } from '@/utils/noteUtils'
import * as Tone from 'tone'

export type ToneMode = 'piano' | 'bell' | 'bass' | 'square'

export type ToneEngine = {
  readonly toneMode: Readonly<Ref<ToneMode>>
  readonly isPlaying: Readonly<Ref<boolean>>
  warmUp: () => Promise<void>
  playTone: (frequencyHz: number) => Promise<void>
  setToneMode: (mode: ToneMode) => void
}

const TONE_DURATION_S = 0.7

export function createTonejsAdapter(): ToneEngine {
  const toneMode = ref<ToneMode>('piano')
  const isPlaying = ref(false)

  let toneStarted = false
  let warmUpPromise: Promise<void> | null = null
  let stopTimer: ReturnType<typeof setTimeout> | null = null
  let pianoSampler: Tone.Sampler | null = null
  let pianoSamplerReady = false
  let pianoLoadPromise: Promise<void> | null = null
  let bellSynth: Tone.PolySynth | null = null
  let bassSynth: Tone.MonoSynth | null = null
  let squareSynth: Tone.PolySynth | null = null

  function getPianoSampler(): Tone.Sampler {
    if (!pianoSampler) {
      pianoSampler = new Tone.Sampler({
        urls: { C4: 'sounds/piano-note-c4.wav' },
        baseUrl: import.meta.env.BASE_URL,
        volume: -8,
        onload: () => {
          pianoSamplerReady = true
        },
      })
      pianoSampler.toDestination()
    }

    return pianoSampler
  }

  function loadPiano(): Promise<void> {
    if (pianoLoadPromise) return pianoLoadPromise

    const sampler = getPianoSampler()
    if (pianoSamplerReady) {
      pianoLoadPromise = Promise.resolve()

      return pianoLoadPromise
    }

    pianoLoadPromise = new Promise<void>((resolve) => {
      const check = () => {
        if (pianoSamplerReady) {
          resolve()
        } else {
          setTimeout(check, 50)
        }
      }

      if (sampler.loaded) {
        pianoSamplerReady = true
        resolve()
      } else {
        check()
      }
    })

    return pianoLoadPromise
  }

  function getSquareSynth(): Tone.PolySynth {
    if (!squareSynth) {
      squareSynth = new Tone.PolySynth(Tone.Synth, {
        volume: -12,
        oscillator: { type: 'square' },
        envelope: { attack: 0.01, decay: 0.2, sustain: 0.4, release: 0.3 },
      })
      squareSynth.toDestination()
    }

    return squareSynth
  }

  function getBellSynth(): Tone.PolySynth {
    if (!bellSynth) {
      bellSynth = new Tone.PolySynth(Tone.FMSynth, {
        volume: -8,
        harmonicity: 5.1,
        modulationIndex: 3,
        oscillator: { type: 'sine' },
        envelope: { attack: 0.001, decay: 1.0, sustain: 0.1, release: 1.5 },
        modulation: { type: 'square' },
        modulationEnvelope: {
          attack: 0.002,
          decay: 0.5,
          sustain: 0.2,
          release: 0.5,
        },
      })
      bellSynth.toDestination()
    }

    return bellSynth
  }

  function getBassSynth(): Tone.MonoSynth {
    if (!bassSynth) {
      bassSynth = new Tone.MonoSynth({
        volume: -6,
        oscillator: { type: 'square' },
        filter: { Q: 2, type: 'lowpass', rolloff: -12 },
        envelope: { attack: 0.02, decay: 0.3, sustain: 0.7, release: 0.5 },
        filterEnvelope: {
          attack: 0.04,
          decay: 0.2,
          sustain: 0.3,
          release: 0.5,
          baseFrequency: 100,
          octaves: 2.5,
        },
      })
      bassSynth.toDestination()
    }

    return bassSynth
  }

  async function warmUp(): Promise<void> {
    if (warmUpPromise) return warmUpPromise

    warmUpPromise = (async () => {
      await Tone.start()
      toneStarted = true
      if (toneMode.value === 'piano') {
        await loadPiano()
      }
    })()

    return warmUpPromise
  }

  function stopCurrent() {
    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }
    isPlaying.value = false
  }

  async function playTone(frequencyHz: number): Promise<void> {
    const t0 = performance.now()
    stopCurrent()

    const noteName = frequencyToNoteName(frequencyHz)
    if (!noteName) return

    if (!toneStarted) {
      const tStart = performance.now()
      await Tone.start()
      toneStarted = true
      debugLog(
        `[TonePlayer] Tone.start(): ${(performance.now() - tStart).toFixed(1)}ms`,
      )
    }

    isPlaying.value = true

    if (toneMode.value === 'piano') {
      const tSampler = performance.now()
      const sampler = getPianoSampler()
      debugLog(
        `[TonePlayer] getPianoSampler(): ${(performance.now() - tSampler).toFixed(1)}ms (ready=${pianoSamplerReady})`,
      )
      if (!pianoSamplerReady) {
        const tLoad = performance.now()
        await loadPiano()
        debugLog(
          `[TonePlayer] loadPiano(): ${(performance.now() - tLoad).toFixed(1)}ms`,
        )
      }
      sampler.triggerAttackRelease(noteName, TONE_DURATION_S)
      debugLog(
        `[TonePlayer] triggerAttackRelease(${noteName}): ${(performance.now() - t0).toFixed(1)}ms total`,
      )
    } else if (toneMode.value === 'bell') {
      getBellSynth().triggerAttackRelease(noteName, TONE_DURATION_S)
      debugLog(
        `[TonePlayer] bell triggerAttackRelease(${noteName}): ${(performance.now() - t0).toFixed(1)}ms total`,
      )
    } else if (toneMode.value === 'bass') {
      getBassSynth().triggerAttackRelease(noteName, TONE_DURATION_S)
      debugLog(
        `[TonePlayer] bass triggerAttackRelease(${noteName}): ${(performance.now() - t0).toFixed(1)}ms total`,
      )
    } else {
      getSquareSynth().triggerAttackRelease(noteName, TONE_DURATION_S)
      debugLog(
        `[TonePlayer] square triggerAttackRelease(${noteName}): ${(performance.now() - t0).toFixed(1)}ms total`,
      )
    }

    stopTimer = setTimeout(() => {
      isPlaying.value = false
      stopTimer = null
    }, TONE_DURATION_S * 1000)
  }

  function setToneMode(mode: ToneMode): void {
    toneMode.value = mode
  }

  return {
    toneMode: readonly(toneMode),
    isPlaying: readonly(isPlaying),
    warmUp,
    playTone,
    setToneMode,
  }
}

export const defaultToneEngine: ToneEngine = createTonejsAdapter()

import type { DetectedTone } from '@/components/tone-detector/toneDetectionTypes'
import type { NoteName } from '@/utils/noteUtils'
import { frequencyToNote, noteToFrequency } from '@/utils/noteUtils'
import {
  MAX_TONES,
  estimateNoiseFloorDb,
  findPeaks,
  noiseGateToFloorDb,
  sensitivityToAdaptiveRange,
  sieveFundamentals,
} from './toneDetection'

/*
 * Developer harness for the tone detector: synthesises the configured tones
 * with oscillators and runs them through the REAL detection path, so the test
 * page exercises findPeaks/sieveFundamentals rather than faking their output.
 *
 * No microphone — oscillators only — so the page stays runnable in CI and on
 * machines without mic permission, per the test-page rule in
 * .github/copilot-instructions.md.
 *
 * Timbre matters more than any other control here: the harmonic sieve exists
 * because bright, harmonic-rich sources are what break naive overtone
 * filtering. A sine has nothing to suppress; a sawtooth has everything.
 */

/* Analyser settings must match useMultiToneDetection.ts or this harness would
 * be measuring a different detector than the one that ships. */
const FFT_SIZE = 4096
const SMOOTHING_TIME_CONSTANT = 0.2

/* Per-oscillator gain. Kept well under 1 so several tones can sum without the
 * mix clipping, which would add harmonics the tones never had. */
const TONE_GAIN = 0.15

/* ±30 cents — matches MAX_CENTS_DEVIATION in useMultiToneDetection */
const MAX_CENTS_DEVIATION = 30

export type SimulatedToneConfig = {
  note: NoteName
  octave: number
  cents: number
  jitter: number
  enabled: boolean
  timbre: OscillatorType
}

type ToneVoice = {
  oscillator: OscillatorNode
  gain: GainNode
}

export function useSynthesizedToneDetection(
  tones: Ref<SimulatedToneConfig[]>,
  settings?: {
    sensitivity: Readonly<Ref<number>>
    noiseGate: Readonly<Ref<number>>
  },
) {
  const sensitivity = settings?.sensitivity ?? ref(5)
  const noiseGate = settings?.noiseGate ?? ref(5)

  const detectedTones = ref<DetectedTone[]>([])
  const isListening = ref(false)
  const error = ref<string | null>(null)

  let audioContext: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  /* Float32Array<ArrayBuffer>, not plain Float32Array: getFloatFrequencyData
   * rejects the ArrayBufferLike-widened form. */
  let spectrum: Float32Array<ArrayBuffer> | null = null
  let animationFrameId: number | null = null
  let voices: ToneVoice[] = []

  function targetFrequency(config: SimulatedToneConfig): number {
    const baseHz = noteToFrequency(config.note, config.octave)
    const centsOffset = config.cents + (Math.random() - 0.5) * config.jitter
    // 1200 cents = 1 octave; 2^(cents/1200) converts cents offset to frequency ratio
    return baseHz * Math.pow(2, centsOffset / 1200)
  }

  /* Rebuild the oscillator bank to match the current config. Cheap enough to do
   * wholesale on any change — these are a handful of nodes. */
  function syncVoices() {
    if (!audioContext || !analyserNode) return

    for (const voice of voices) {
      voice.oscillator.stop()
      voice.oscillator.disconnect()
      voice.gain.disconnect()
    }
    voices = []

    for (const config of tones.value) {
      if (!config.enabled) continue

      const oscillator = audioContext.createOscillator()
      oscillator.type = config.timbre
      oscillator.frequency.value = targetFrequency(config)

      const gain = audioContext.createGain()
      gain.gain.value = TONE_GAIN

      oscillator.connect(gain)
      gain.connect(analyserNode)
      oscillator.start()

      voices.push({ oscillator, gain })
    }
  }

  function tick() {
    if (!isListening.value || !analyserNode || !spectrum || !audioContext)
      return

    analyserNode.getFloatFrequencyData(spectrum)

    const sampleRate = audioContext.sampleRate
    const peaks = findPeaks(
      spectrum,
      sampleRate,
      FFT_SIZE,
      noiseGateToFloorDb(noiseGate.value),
      sensitivityToAdaptiveRange(sensitivity.value),
    )

    const result: DetectedTone[] = []
    const seenMidi = new Set<number>()

    for (const peak of sieveFundamentals(
      peaks,
      sampleRate / FFT_SIZE,
      MAX_TONES,
      estimateNoiseFloorDb(spectrum, sampleRate, FFT_SIZE),
    )) {
      const info = frequencyToNote(peak.frequency)
      if (!info) continue
      if (seenMidi.has(info.midiNote)) continue

      seenMidi.add(info.midiNote)
      result.push({
        ...info,
        isClean: Math.abs(info.cents) <= MAX_CENTS_DEVIATION,
      })
    }

    result.sort((a, b) => a.midiNote - b.midiNote)
    detectedTones.value = result

    animationFrameId = requestAnimationFrame(tick)
  }

  function start() {
    if (isListening.value) return

    error.value = null

    try {
      audioContext = new AudioContext()
      analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = FFT_SIZE
      analyserNode.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT
      spectrum = new Float32Array(analyserNode.frequencyBinCount)

      /* Analysed but never routed to the speakers — this is a measurement rig,
       * and a wall of sawtooths is unpleasant to develop against. */
      syncVoices()

      isListening.value = true
      tick()
    } catch (caught) {
      error.value =
        caught instanceof Error ? caught.message : 'Audio synthesis failed'
      isListening.value = false
    }
  }

  function stop() {
    isListening.value = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    for (const voice of voices) {
      voice.oscillator.stop()
      voice.oscillator.disconnect()
      voice.gain.disconnect()
    }
    voices = []

    if (audioContext) {
      void audioContext.close()
      audioContext = null
    }

    analyserNode = null
    spectrum = null
    detectedTones.value = []
  }

  /* Config edits take effect live while listening. */
  watch(
    tones,
    () => {
      if (isListening.value) syncVoices()
    },
    { deep: true },
  )

  onUnmounted(() => {
    stop()
  })

  return {
    detectedTones: readonly(detectedTones),
    isListening: readonly(isListening),
    error: readonly(error),
    start,
    stop,
  }
}

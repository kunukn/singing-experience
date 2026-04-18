import type { NoteInfo } from '@/utils/noteUtils'
import { frequencyToNote } from '@/utils/noteUtils'

/* Noise floor — FFT bins below this dB level are ignored. */
const NOISE_THRESHOLD_DB = -60

/* A peak must be at least this many dB above its neighbours to qualify. */
const MIN_PEAK_PROMINENCE_DB = 10

/* Practical range for detected tones: ~C2 (65 Hz) to ~C7 (2100 Hz). */
const MIN_FREQUENCY = 65
const MAX_FREQUENCY = 2100

/* Maximum number of simultaneous tones to report. */
const MAX_TONES = 8

/*
 * Harmonic suppression ratio — if a peak at frequency f has a louder peak
 * near f/n (for n = 2,3,4), it is likely an overtone and gets suppressed.
 * The tolerance is ±this fraction of the fundamental candidate's frequency.
 */
const HARMONIC_TOLERANCE = 0.03

type DetectedTone = NoteInfo

function findPeaks(
  spectrum: Float32Array<ArrayBuffer>,
  sampleRate: number,
  fftSize: number,
): { frequency: number; magnitude: number }[] {
  const binWidth = sampleRate / fftSize
  const minBin = Math.ceil(MIN_FREQUENCY / binWidth)
  const maxBin = Math.min(
    Math.floor(MAX_FREQUENCY / binWidth),
    spectrum.length - 2,
  )

  const peaks: { frequency: number; magnitude: number; bin: number }[] = []

  for (let i = minBin; i <= maxBin; i++) {
    const mag = spectrum[i]
    if (mag < NOISE_THRESHOLD_DB) continue

    const left = spectrum[i - 1]
    const right = spectrum[i + 1]

    /* Local maximum check */
    if (mag > left && mag > right) {
      /* Prominence: must be meaningfully above both neighbours */
      const minNeighbour = Math.min(left, right)
      if (mag - minNeighbour < MIN_PEAK_PROMINENCE_DB) continue

      /* Quadratic interpolation for sub-bin accuracy */
      const delta = (0.5 * (right - left)) / (2 * mag - left - right)
      const exactBin = i + delta
      const freq = exactBin * binWidth

      peaks.push({ frequency: freq, magnitude: mag, bin: i })
    }
  }

  /* Sort by magnitude descending — loudest first */
  peaks.sort((a, b) => b.magnitude - a.magnitude)

  return peaks
}

function suppressHarmonics(
  peaks: { frequency: number; magnitude: number }[],
): { frequency: number; magnitude: number }[] {
  const kept: { frequency: number; magnitude: number }[] = []

  for (const peak of peaks) {
    let isHarmonic = false

    for (const fundamental of kept) {
      for (let n = 2; n <= 4; n++) {
        const expectedHarmonic = fundamental.frequency * n
        const tolerance = expectedHarmonic * HARMONIC_TOLERANCE
        if (Math.abs(peak.frequency - expectedHarmonic) < tolerance) {
          isHarmonic = true
          break
        }
      }
      if (isHarmonic) break
    }

    if (!isHarmonic) {
      kept.push(peak)
    }
  }

  return kept
}

export function useMultiToneDetection() {
  const detectedTones = ref<DetectedTone[]>([])
  const isListening = ref(false)
  const error = ref<string | null>(null)

  let audioContext: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let animationFrameId: number | null = null

  function detect(
    spectrum: Float32Array<ArrayBuffer>,
    sampleRate: number,
    fftSize: number,
  ) {
    const rawPeaks = findPeaks(spectrum, sampleRate, fftSize)
    const filtered = suppressHarmonics(rawPeaks).slice(0, MAX_TONES)

    const tones: DetectedTone[] = []
    const seenMidi = new Set<number>()

    for (const peak of filtered) {
      const info = frequencyToNote(peak.frequency)
      if (!info) continue
      if (seenMidi.has(info.midiNote)) continue

      seenMidi.add(info.midiNote)
      tones.push(info)
    }

    /* Sort by MIDI note ascending (low to high) */
    tones.sort((a, b) => a.midiNote - b.midiNote)

    detectedTones.value = tones

    if (isListening.value) {
      animationFrameId = requestAnimationFrame(() =>
        detectLoop(spectrum, sampleRate, fftSize),
      )
    }
  }

  function detectLoop(
    spectrum: Float32Array<ArrayBuffer>,
    sampleRate: number,
    fftSize: number,
  ) {
    analyserNode!.getFloatFrequencyData(spectrum)
    detect(spectrum, sampleRate, fftSize)
  }

  async function start() {
    if (isListening.value) return

    error.value = null

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContext = new AudioContext()
      analyserNode = audioContext.createAnalyser()
      analyserNode.fftSize = 4096
      analyserNode.smoothingTimeConstant = 0.4

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyserNode)

      const spectrum = new Float32Array(analyserNode.frequencyBinCount)

      isListening.value = true
      detectLoop(spectrum, audioContext.sampleRate, analyserNode.fftSize)
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : 'Failed to access microphone'
      isListening.value = false
    }
  }

  function stop() {
    isListening.value = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop())
      mediaStream = null
    }

    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    analyserNode = null
    detectedTones.value = []
  }

  return {
    detectedTones: readonly(detectedTones),
    isListening: readonly(isListening),
    error: readonly(error),
    start,
    stop,
  }
}

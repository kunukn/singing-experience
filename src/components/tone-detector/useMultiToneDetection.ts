import type { DetectedTone } from '@/components/tone-detector/toneDetectionTypes'
import { frequencyToNote } from '@/utils/noteUtils'

/*
 * Wider-window prominence — a peak must be this many dB above the average
 * of bins ±PROMINENCE_WINDOW away, not just immediate neighbours.
 */
const MIN_PEAK_PROMINENCE_DB = 3
const PROMINENCE_WINDOW = 4

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
const HARMONIC_TOLERANCE = 0.04

/* ms to hold a tone before reporting onset — avoids transient flicker on brief sounds */
const ONSET_DEBOUNCE_MS = 40

/* ±30 cents — only report a note when the frequency is within ~1.7% of perfect pitch */
const MAX_CENTS_DEVIATION = 30

/* Maps a 0–10 user slider to the adaptive range in dB (lower = stricter).
 * ×4 gives 0–40 dB range — at 0 only the loudest peak passes, at 10 even quiet tones show. */
function sensitivityToAdaptiveRange(sensitivity: number): number {
  return sensitivity * 4
}

/* Maps a 0–10 user slider to absolute floor in dB (higher slider = louder floor).
 * Base −80 dB is near silence; ×4 maps slider 0→−80 dB (hear everything), 10→−40 dB (gate noise). */
function noiseGateToFloorDb(noiseGate: number): number {
  return -80 + noiseGate * 4
}

type ToneDetectionConfig = {
  sensitivity: Readonly<Ref<number>>
  noiseGate: Readonly<Ref<number>>
}

function findPeaks(
  spectrum: Float32Array<ArrayBuffer>,
  sampleRate: number,
  fftSize: number,
  absoluteFloorDb: number,
  adaptiveRangeDb: number,
): { frequency: number; magnitude: number }[] {
  const binWidth = sampleRate / fftSize
  // Start at bin 2 minimum — bin 0 is DC offset, bin 1 prone to low-frequency noise
  const minBin = Math.max(2, Math.ceil(MIN_FREQUENCY / binWidth))
  const maxBin = Math.min(
    Math.floor(MAX_FREQUENCY / binWidth),
    spectrum.length - 2,
  )

  /* Find the loudest bin in range to set an adaptive threshold */
  let maxMag = -Infinity
  for (let i = minBin; i <= maxBin; i++) {
    if (spectrum[i] > maxMag) maxMag = spectrum[i]
  }

  /* If the loudest bin is below the absolute floor, there is no signal */
  if (maxMag < absoluteFloorDb) return []

  const threshold = Math.max(absoluteFloorDb, maxMag - adaptiveRangeDb)

  const peaks: { frequency: number; magnitude: number; bin: number }[] = []

  for (let i = minBin; i <= maxBin; i++) {
    const mag = spectrum[i]
    if (mag < threshold) continue

    const left = spectrum[i - 1]
    const right = spectrum[i + 1]

    /* Local maximum: must be higher than both immediate neighbours */
    if (mag <= left || mag <= right) continue

    /*
     * Wider prominence check — compare against the average magnitude
     * of bins PROMINENCE_WINDOW steps away in each direction.
     */
    let surroundSum = 0
    let surroundCount = 0
    for (let w = 2; w <= PROMINENCE_WINDOW; w++) {
      if (i - w >= 0) {
        surroundSum += spectrum[i - w]
        surroundCount++
      }
      if (i + w < spectrum.length) {
        surroundSum += spectrum[i + w]
        surroundCount++
      }
    }
    const surroundAvg = surroundCount > 0 ? surroundSum / surroundCount : mag
    if (mag - surroundAvg < MIN_PEAK_PROMINENCE_DB) continue

    /* Quadratic (parabolic) interpolation for sub-bin frequency accuracy.
     * Fits a parabola through left/center/right magnitudes to find the true peak offset. */
    const denom = 2 * mag - left - right
    if (denom === 0) continue

    const delta = (0.5 * (right - left)) / denom // fractional bin offset from center
    const exactBin = i + delta
    const freq = exactBin * binWidth

    peaks.push({ frequency: freq, magnitude: mag, bin: i })
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
        // check 2nd, 3rd, and 4th harmonics
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

export function useMultiToneDetection(config?: ToneDetectionConfig) {
  const { t } = useI18n()
  const sensitivity = config?.sensitivity ?? ref(5)
  const noiseGate = config?.noiseGate ?? ref(5)

  const detectedTones = ref<DetectedTone[]>([])
  const isListening = ref(false)
  const error = ref<string | null>(null)

  let audioContext: AudioContext | null = null
  let analyserNode: AnalyserNode | null = null
  let mediaStream: MediaStream | null = null
  let animationFrameId: number | null = null
  let toneOnsetMap = new Map<number, number>()

  function detect(
    spectrum: Float32Array<ArrayBuffer>,
    sampleRate: number,
    fftSize: number,
  ) {
    const absoluteFloorDb = noiseGateToFloorDb(noiseGate.value)
    const adaptiveRangeDb = sensitivityToAdaptiveRange(sensitivity.value)

    const rawPeaks = findPeaks(
      spectrum,
      sampleRate,
      fftSize,
      absoluteFloorDb,
      adaptiveRangeDb,
    )
    const filtered = suppressHarmonics(rawPeaks).slice(0, MAX_TONES)

    const tones: DetectedTone[] = []
    const seenMidi = new Set<number>()

    for (const peak of filtered) {
      const info = frequencyToNote(peak.frequency)
      if (!info) continue
      if (seenMidi.has(info.midiNote)) continue

      seenMidi.add(info.midiNote)
      tones.push({
        ...info,
        isClean: Math.abs(info.cents) <= MAX_CENTS_DEVIATION,
      })
    }

    /* Sort by MIDI note ascending (low to high) */
    tones.sort((a, b) => a.midiNote - b.midiNote)

    /* Onset debounce — only report tones present continuously for ≥ ONSET_DEBOUNCE_MS */
    const now = performance.now()
    const currentMidiNotes = new Set(tones.map((t) => t.midiNote))

    for (const midi of toneOnsetMap.keys()) {
      if (!currentMidiNotes.has(midi)) toneOnsetMap.delete(midi)
    }

    for (const midi of currentMidiNotes) {
      if (!toneOnsetMap.has(midi)) toneOnsetMap.set(midi, now)
    }

    detectedTones.value = tones.filter(
      (t) => now - toneOnsetMap.get(t.midiNote)! >= ONSET_DEBOUNCE_MS,
    )

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
      // 4096-sample FFT: higher resolution than pitch detection to separate close tones
      analyserNode.fftSize = 4096
      // Light temporal smoothing (0.2) — reduces flicker while keeping transient response
      analyserNode.smoothingTimeConstant = 0.2

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyserNode)

      const spectrum = new Float32Array(analyserNode.frequencyBinCount)

      isListening.value = true
      detectLoop(spectrum, audioContext.sampleRate, analyserNode.fftSize)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : t('errors.microphoneAccess')
      error.value = message
      useErrorToastStore().addError(message)
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
    toneOnsetMap = new Map()
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

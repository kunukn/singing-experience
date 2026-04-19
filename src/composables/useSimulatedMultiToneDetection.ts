import type { NoteInfo, NoteName } from '@/utils/noteUtils'
import { frequencyToNote, noteToFrequency } from '@/utils/noteUtils'

/* ±30 cents — matches MAX_CENTS_DEVIATION in useMultiToneDetection */
const MAX_CENTS_DEVIATION = 30

export type SimulatedToneConfig = {
  note: NoteName
  octave: number
  cents: number
  jitter: number
  enabled: boolean
}

type DetectedTone = NoteInfo & {
  isClean: boolean
}

export function useSimulatedMultiToneDetection(
  tones: Ref<SimulatedToneConfig[]>,
) {
  const detectedTones = ref<DetectedTone[]>([])
  const isListening = ref(false)
  const error = ref<string | null>(null)

  let animationFrameId: number | null = null

  function computeFrequency(config: SimulatedToneConfig): number {
    const baseHz = noteToFrequency(config.note, config.octave)
    const centsOffset = config.cents + (Math.random() - 0.5) * config.jitter
    // 1200 cents = 1 octave; 2^(cents/1200) converts cents offset to frequency ratio
    return baseHz * Math.pow(2, centsOffset / 1200)
  }

  function tick() {
    if (!isListening.value) return

    const result: DetectedTone[] = []
    const seenMidi = new Set<number>()

    for (const config of tones.value) {
      if (!config.enabled) continue

      const hz = computeFrequency(config)
      const info = frequencyToNote(hz)
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
    isListening.value = true
    tick()
  }

  function stop() {
    isListening.value = false

    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

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

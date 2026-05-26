import type { PitchSample } from './PitchHistoryCanvas.vue'
import { PAUSE_GAP_MS } from './pitchConstants'
import { midiToFrequency } from '@/utils/noteUtils'

/* Volume in dB — matches the tuning fork synth level for consistency */
const REPLAY_VOLUME_DB = -10

/* Fade duration in seconds for segment boundaries — short enough to feel natural */
const FADE_S = 0.02

export function usePitchReplay() {
  const isReplaying = ref(false)
  const replayProgress = ref<number | null>(null)
  const replayElapsedSeconds = ref<string | null>(null)

  let audioCtx: AudioContext | null = null
  let oscillator: OscillatorNode | null = null
  let gainNode: GainNode | null = null
  let stopTimer: ReturnType<typeof setTimeout> | null = null
  let rafId: number | null = null
  let replayStartWall = 0
  let replayDurationMs = 0
  let replaySpeed = 1

  function stopProgressLoop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    replayProgress.value = null
    replayElapsedSeconds.value = null
  }

  function tickProgress() {
    if (replayDurationMs <= 0) {
      replayProgress.value = null
      replayElapsedSeconds.value = null
      rafId = null

      return
    }

    const elapsed = performance.now() - replayStartWall
    const t = Math.min(elapsed / replayDurationMs, 1)
    replayProgress.value = t

    /* Recorded-time elapsed — scales with replay speed so the timer always
     * tops out at the original recording duration regardless of 1×/2×. */
    const recordedElapsedMs = Math.min(
      elapsed * replaySpeed,
      replayDurationMs * replaySpeed,
    )
    replayElapsedSeconds.value = (recordedElapsedMs / 1000).toFixed(1)

    if (t < 1) {
      rafId = requestAnimationFrame(tickProgress)
    } else {
      rafId = null
    }
  }

  function stopReplay() {
    stopProgressLoop()

    if (stopTimer) {
      clearTimeout(stopTimer)
      stopTimer = null
    }

    if (oscillator) {
      try {
        oscillator.stop()
      } catch {
        /* already stopped */
      }
      oscillator.disconnect()
      oscillator = null
    }

    if (gainNode) {
      gainNode.disconnect()
      gainNode = null
    }

    isReplaying.value = false
  }

  function replayPitchHistory(
    samples: PitchSample[],
    options: { speed?: number } = {},
  ) {
    stopReplay()

    /* Playback speed multiplier — 1× plays at recorded rate, 2× plays twice as fast.
     * Frequency targets stay the same; only the audio timeline is compressed,
     * so no pitch shift / time-stretch is needed. */
    const speed = options.speed && options.speed > 0 ? options.speed : 1
    replaySpeed = speed

    const cleanSamples = samples.filter((s) => s.isClean)
    if (cleanSamples.length === 0) return

    if (!audioCtx) {
      audioCtx = new AudioContext()
    }

    const ctx = audioCtx

    /* Convert dB to linear gain: 10^(dB/20) */
    const linearGain = Math.pow(10, REPLAY_VOLUME_DB / 20)

    gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.connect(ctx.destination)

    oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.connect(gainNode)

    const startTime = ctx.currentTime
    const firstTimestamp = cleanSamples[0].timestamp
    const lastTimestamp = cleanSamples[cleanSamples.length - 1].timestamp
    const totalDurationS = (lastTimestamp - firstTimestamp) / 1000

    /*
     * Split clean samples into segments separated by pauses.
     * Each segment is a continuous run of singing with no gap > PAUSE_GAP_MS.
     */
    const segments: PitchSample[][] = []
    let currentSeg: PitchSample[] = [cleanSamples[0]]
    for (let i = 1; i < cleanSamples.length; i++) {
      if (
        cleanSamples[i].timestamp - cleanSamples[i - 1].timestamp >
        PAUSE_GAP_MS
      ) {
        segments.push(currentSeg)
        currentSeg = []
      }
      currentSeg.push(cleanSamples[i])
    }
    if (currentSeg.length > 0) segments.push(currentSeg)

    /* Set initial frequency before starting */
    const initialFreq = midiToFrequency(cleanSamples[0].midiNote)
    oscillator.frequency.setValueAtTime(initialFreq, startTime)

    /* Schedule frequency ramps for all sample points */
    for (const sample of cleanSamples) {
      const offsetS = (sample.timestamp - firstTimestamp) / 1000 / speed
      const freq = midiToFrequency(sample.midiNote)
      oscillator.frequency.linearRampToValueAtTime(freq, startTime + offsetS)
    }

    /* Schedule gain envelope per segment — silence between segments */
    for (const seg of segments) {
      const segStartS = (seg[0].timestamp - firstTimestamp) / 1000 / speed
      const segEndS =
        (seg[seg.length - 1].timestamp - firstTimestamp) / 1000 / speed

      /* Fade in at segment start */
      gainNode.gain.setValueAtTime(0, startTime + segStartS)
      gainNode.gain.linearRampToValueAtTime(
        linearGain,
        startTime + segStartS + FADE_S,
      )

      /* Hold gain, then fade out at segment end */
      gainNode.gain.setValueAtTime(linearGain, startTime + segEndS)
      gainNode.gain.linearRampToValueAtTime(0, startTime + segEndS + FADE_S)
    }

    const scaledDurationS = totalDurationS / speed

    oscillator.start(startTime)
    oscillator.stop(startTime + scaledDurationS + 0.1)

    isReplaying.value = true

    /* Start progress tracking via requestAnimationFrame */
    replayDurationMs = scaledDurationS * 1000
    replayStartWall = performance.now()
    replayProgress.value = 0
    replayElapsedSeconds.value = '0.0'
    rafId = requestAnimationFrame(tickProgress)

    /* Auto-stop reactive state after playback finishes */
    const totalMs = (scaledDurationS + 0.1) * 1000
    stopTimer = setTimeout(() => {
      stopProgressLoop()
      isReplaying.value = false
      oscillator = null
      gainNode = null
      stopTimer = null
    }, totalMs)
  }

  if (getCurrentInstance()) {
    onUnmounted(() => {
      stopReplay()
    })
  }

  return {
    isReplaying: readonly(isReplaying),
    replayProgress: readonly(replayProgress),
    replayElapsedSeconds: readonly(replayElapsedSeconds),
    replayPitchHistory,
    stopReplay,
  }
}

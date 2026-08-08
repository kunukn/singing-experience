import type { PitchSample } from './pitchLaneRecorder'
import type { PitchLaneId } from './pitchLanes'
import { PAUSE_GAP_MS } from './pitchConstants'
import { midiToFrequency } from '@/utils/noteUtils'

/* Volume in dB — matches the tuning fork synth level for consistency */
const REPLAY_VOLUME_DB = -10

/* dB taken off each voice when two play at once, so a duet is not twice as loud
 * as a solo. Two uncorrelated sines sum to about +3 dB. */
const DUET_HEADROOM_DB = 3

/* Fade duration in seconds for segment boundaries — short enough to feel natural */
const FADE_S = 0.02

type LaneVoice = {
  oscillator: OscillatorNode
  gainNode: GainNode
}

export function usePitchReplay() {
  const isReplaying = ref(false)
  const replayProgress = ref<number | null>(null)
  const replayElapsedSeconds = ref<string | null>(null)

  let audioCtx: AudioContext | null = null
  /* One voice per recorded lane. A duet needs two oscillators — a single one
   * cannot hold two pitches — but they share the AudioContext and, crucially,
   * one time origin, so the voices stay in sync with each other and with the
   * chart scrub. */
  let voices: LaneVoice[] = []
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

    for (const voice of voices) {
      try {
        voice.oscillator.stop()
      } catch {
        /* already stopped */
      }
      voice.oscillator.disconnect()
      voice.gainNode.disconnect()
    }
    voices = []

    isReplaying.value = false
  }

  /*
   * Split clean samples into segments separated by pauses.
   * Each segment is a continuous run of singing with no gap > PAUSE_GAP_MS.
   */
  function splitIntoSegments(samples: PitchSample[]): PitchSample[][] {
    const segments: PitchSample[][] = []
    let currentSeg: PitchSample[] = [samples[0]]

    for (let i = 1; i < samples.length; i++) {
      if (samples[i].timestamp - samples[i - 1].timestamp > PAUSE_GAP_MS) {
        segments.push(currentSeg)
        currentSeg = []
      }
      currentSeg.push(samples[i])
    }
    if (currentSeg.length > 0) segments.push(currentSeg)

    return segments
  }

  /* Schedule one voice against the shared start time and time origin. */
  function scheduleLane(
    ctx: AudioContext,
    samples: PitchSample[],
    startTime: number,
    originTimestamp: number,
    speed: number,
    linearGain: number,
  ): LaneVoice {
    const gainNode = ctx.createGain()
    gainNode.gain.setValueAtTime(0, ctx.currentTime)
    gainNode.connect(ctx.destination)

    const oscillator = ctx.createOscillator()
    oscillator.type = 'sine'
    oscillator.connect(gainNode)

    /* Set initial frequency before starting */
    oscillator.frequency.setValueAtTime(
      midiToFrequency(samples[0].midiNote),
      startTime,
    )

    /* Schedule frequency ramps for all sample points */
    for (const sample of samples) {
      const offsetS = (sample.timestamp - originTimestamp) / 1000 / speed
      oscillator.frequency.linearRampToValueAtTime(
        midiToFrequency(sample.midiNote),
        startTime + offsetS,
      )
    }

    /* Schedule gain envelope per segment — silence between segments */
    for (const seg of splitIntoSegments(samples)) {
      const segStartS = (seg[0].timestamp - originTimestamp) / 1000 / speed
      const segEndS =
        (seg[seg.length - 1].timestamp - originTimestamp) / 1000 / speed

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

    return { oscillator, gainNode }
  }

  /**
   * Play a recording back as sine tones, one voice per lane. Lanes share a
   * single time origin (the earliest clean sample across all of them) so a duet
   * replays as a duet rather than two takes starting together.
   */
  function replayPitchHistory(
    lanes: Partial<Record<PitchLaneId, PitchSample[]>>,
    options: { speed?: number } = {},
  ) {
    stopReplay()

    /* Playback speed multiplier — 1× plays at recorded rate, 2× plays twice as fast.
     * Frequency targets stay the same; only the audio timeline is compressed,
     * so no pitch shift / time-stretch is needed. */
    const speed = options.speed && options.speed > 0 ? options.speed : 1
    replaySpeed = speed

    const cleanLanes = Object.values(lanes)
      .map((samples) => (samples ?? []).filter((sample) => sample.isClean))
      .filter((samples) => samples.length > 0)
    if (cleanLanes.length === 0) return

    if (!audioCtx) {
      audioCtx = new AudioContext()
    }

    const ctx = audioCtx

    /* Convert dB to linear gain: 10^(dB/20) */
    const volumeDb =
      REPLAY_VOLUME_DB - (cleanLanes.length > 1 ? DUET_HEADROOM_DB : 0)
    const linearGain = Math.pow(10, volumeDb / 20)

    const startTime = ctx.currentTime
    /* The shared origin and end: every lane is scheduled against these, so a
     * voice that came in late still comes in late on playback. */
    const originTimestamp = Math.min(
      ...cleanLanes.map((samples) => samples[0].timestamp),
    )
    const lastTimestamp = Math.max(
      ...cleanLanes.map((samples) => samples[samples.length - 1].timestamp),
    )
    const totalDurationS = (lastTimestamp - originTimestamp) / 1000

    voices = cleanLanes.map((samples) =>
      scheduleLane(ctx, samples, startTime, originTimestamp, speed, linearGain),
    )

    const scaledDurationS = totalDurationS / speed

    for (const voice of voices) {
      voice.oscillator.start(startTime)
      voice.oscillator.stop(startTime + scaledDurationS + 0.1)
    }

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
      voices = []
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

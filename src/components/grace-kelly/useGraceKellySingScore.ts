import type { Ref } from 'vue'

/* Minimum fraction of voiced singing time (by duration) that must land on-pitch
 * for the end-of-song celebration to fire. 0.8 = 80%. */
const CONFETTI_THRESHOLD = 0.8

/*
 * Scores a live sing run by "voiced accuracy": of the time the singer was
 * actually producing a clean tone, what fraction was on the target pitch.
 * Silence, breaths, and consonants are excluded from both the numerator and the
 * denominator, so they neither help nor hurt — only voicing a wrong pitch costs
 * points. A held, constant, correct tone scores 100%.
 *
 * A requestAnimationFrame loop runs only while `isPlaying`, so pauses are
 * excluded too.
 */
export function useGraceKellySingScore(params: {
  isPlaying: Ref<boolean>
  /* True while a clean sung pitch is detected (frequency !== null). */
  isVoiced: Ref<boolean>
  /* True while the sung pitch is within scoring tolerance of the target note. */
  isOnPitch: Ref<boolean>
}) {
  const { isPlaying, isVoiced, isOnPitch } = params

  /* Wall-clock ms the singer was producing a clean tone — the denominator. */
  const voicedMs = ref(0)
  /* Subset of voicedMs during which the sung pitch was on target. */
  const onPitchMs = ref(0)

  let rafId: number | null = null
  let lastTimestamp: number | null = null

  function tick(timestamp: number) {
    if (lastTimestamp !== null && isVoiced.value) {
      const delta = timestamp - lastTimestamp
      voicedMs.value += delta
      if (isOnPitch.value) onPitchMs.value += delta
    }
    lastTimestamp = timestamp
    rafId = requestAnimationFrame(tick)
  }

  function startTicking() {
    if (rafId !== null) return

    lastTimestamp = null // skip the first delta (unknown gap since last run)
    rafId = requestAnimationFrame(tick)
  }

  function stopTicking() {
    if (rafId !== null) cancelAnimationFrame(rafId)

    rafId = null
    lastTimestamp = null
  }

  /* Zero the accumulators for a fresh run. Call on each new start(). */
  function reset() {
    voicedMs.value = 0
    onPitchMs.value = 0
  }

  const onPitchRatio = computed(() =>
    voicedMs.value === 0 ? 0 : onPitchMs.value / voicedMs.value,
  )
  const reachedThreshold = computed(
    () => onPitchRatio.value >= CONFETTI_THRESHOLD,
  )

  watch(isPlaying, (playing) => (playing ? startTicking() : stopTicking()))

  onUnmounted(stopTicking)

  return { onPitchRatio, reachedThreshold, reset }
}

import type { Ref } from 'vue'

/* Minimum fraction of singing time (by duration) that must land on-pitch for
 * the end-of-song celebration to fire. 0.8 = 80%. */
const CONFETTI_THRESHOLD = 0.8

/*
 * Scores a live sing run by duration: accumulates how long the sung pitch was
 * on-pitch versus how long the timeline was actively playing. A
 * requestAnimationFrame loop runs only while `isPlaying` is true, so pauses are
 * excluded from both the numerator and the denominator.
 */
export function useGraceKellySingScore(params: {
  isPlaying: Ref<boolean>
  isOnPitch: Ref<boolean>
}) {
  const { isPlaying, isOnPitch } = params

  /* Wall-clock ms the timeline has actively played (pauses excluded). */
  const totalMs = ref(0)
  /* Subset of totalMs during which the sung pitch was within tolerance. */
  const onPitchMs = ref(0)

  let rafId: number | null = null
  let lastTimestamp: number | null = null

  function tick(timestamp: number) {
    if (lastTimestamp !== null) {
      const delta = timestamp - lastTimestamp
      totalMs.value += delta
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
    totalMs.value = 0
    onPitchMs.value = 0
  }

  const onPitchRatio = computed(() =>
    totalMs.value === 0 ? 0 : onPitchMs.value / totalMs.value,
  )
  const reachedThreshold = computed(
    () => onPitchRatio.value >= CONFETTI_THRESHOLD,
  )

  watch(isPlaying, (playing) => (playing ? startTicking() : stopTicking()))

  onUnmounted(stopTicking)

  return { onPitchRatio, reachedThreshold, reset }
}

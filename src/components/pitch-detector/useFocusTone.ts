import { useRafFn } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import { frequencyToMidi } from '@/utils/noteUtils'
import { createFocusTracker, type FocusToneStats } from './focusToneTracker'
import type { PitchLaneDetection } from './pitchLanes'

/* How often the stats readout refreshes — at frame rate the numbers flicker
 * too fast to read */
const STATS_REFRESH_MS = 200

type FocusToneOptions = {
  detection: MaybeRefOrGetter<PitchLaneDetection | undefined>
  isListening: MaybeRefOrGetter<boolean>
}

/**
 * Reactive wrapper around createFocusTracker. Samples the detection once per
 * animation frame rather than watching it: a perfectly steady tone yields the
 * same frequency frame after frame, and a watcher would never fire to advance
 * the hold timer.
 */
export function useFocusTone({ detection, isListening }: FocusToneOptions) {
  const tracker = createFocusTracker()

  const focusMidi = ref<number | null>(null)
  const isTrackerLocked = ref(false)
  const liveMidi = ref<number | null>(null)
  const stats = shallowRef<FocusToneStats>(tracker.stats)

  let lastStatsRefresh = 0

  useRafFn(({ timestamp }) => {
    const frequency = toValue(detection)?.noteInfo?.frequency ?? null
    const midi = frequency === null ? null : frequencyToMidi(frequency)

    tracker.push(midi, timestamp)
    liveMidi.value = midi
    focusMidi.value = tracker.focusMidi
    isTrackerLocked.value = tracker.isLocked

    if (timestamp - lastStatsRefresh >= STATS_REFRESH_MS) {
      lastStatsRefresh = timestamp
      stats.value = tracker.stats
    }
  })

  /* Each take gets its own stats, but the tone carries over so the chart does
   * not jump back to its default between takes. */
  watch(
    () => toValue(isListening),
    (listening) => {
      if (!listening) return

      tracker.resetStats()
      stats.value = tracker.stats
    },
  )

  const isLocked = computed({
    get: () => isTrackerLocked.value,
    set: (value: boolean) => {
      tracker.setLocked(value)
      isTrackerLocked.value = tracker.isLocked
    },
  })

  /* Syncs the refs at once rather than on the next frame's push, so a tone
   * picked before Start moves the chart straight away */
  function lockTo(midi: number) {
    tracker.lockTo(midi)
    focusMidi.value = tracker.focusMidi
    isTrackerLocked.value = tracker.isLocked
    stats.value = tracker.stats
  }

  /* Fresh stats for the same tone — the Clear button's half of a reset */
  function clearStats() {
    tracker.resetStats()
    stats.value = tracker.stats
  }

  /* Signed cents from the focus tone; 100 cents per semitone */
  const centsFromFocus = computed(() =>
    focusMidi.value === null || liveMidi.value === null
      ? null
      : (liveMidi.value - focusMidi.value) * 100,
  )

  return { focusMidi, isLocked, centsFromFocus, stats, lockTo, clearStats }
}

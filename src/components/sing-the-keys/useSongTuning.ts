import { useRafFn, useTimeoutFn } from '@vueuse/core'
import type { MaybeRefOrGetter } from 'vue'
import {
  rangeOffsetForLowestMidi,
  sungMidiRange,
  tonicMidiForRange,
  type Song,
} from './singTheKeysSongs'
import { createTuningHold } from '@/utils/tuningHold'

/* How long the "Song range: …" confirmation stays up after a tune */
const RESULT_VISIBLE_MS = 2500

/* exact: the song's lowest note is the sung one. tooLow / tooHigh: the sung
 * note was past the picker's options, so the nearest range was taken. */
export type TuningReach = 'exact' | 'tooLow' | 'tooHigh'

type SongTuningOptions = {
  /* Fractional MIDI of the live sung pitch, or null for silence */
  sungMidi: MaybeRefOrGetter<number | null>
  song: MaybeRefOrGetter<Song>
  onTuned: (rangeOffset: number) => void
}

/**
 * "Tune" for Sing the Keys: the singer holds their lowest comfortable note and
 * the song is moved so its lowest note is that one. Samples once per animation
 * frame rather than watching the pitch, for the reason useFocusTone gives: a
 * perfectly steady tone never changes the ref, so a watcher would stall the
 * hold.
 */
export function useSongTuning({ sungMidi, song, onTuned }: SongTuningOptions) {
  const hold = createTuningHold()

  const isTuning = ref(false)
  const candidateMidi = ref<number | null>(null)
  const progress = ref(0)
  const lastReach = ref<TuningReach | null>(null)

  const { start: startResultTimer, stop: stopResultTimer } = useTimeoutFn(
    () => {
      lastReach.value = null
    },
    RESULT_VISIBLE_MS,
    { immediate: false },
  )

  const { pause, resume } = useRafFn(
    ({ timestamp }) => {
      hold.push(toValue(sungMidi), timestamp)
      candidateMidi.value = hold.candidateMidi
      progress.value = hold.progress

      if (hold.heldMidi !== null) finish(hold.heldMidi)
    },
    { immediate: false },
  )

  function finish(heldMidi: number) {
    const currentSong = toValue(song)
    const { offset, isClamped } = rangeOffsetForLowestMidi(
      currentSong,
      heldMidi,
    )
    const { lowestMidi } = sungMidiRange(
      currentSong,
      tonicMidiForRange(currentSong, offset),
    )

    stopTuning()
    onTuned(offset)
    lastReach.value = !isClamped
      ? 'exact'
      : heldMidi < lowestMidi
        ? 'tooLow'
        : 'tooHigh'
    startResultTimer()
  }

  function stopTuning() {
    pause()
    isTuning.value = false
    candidateMidi.value = null
    progress.value = 0
  }

  function start() {
    stopResultTimer()
    lastReach.value = null
    hold.reset()
    isTuning.value = true
    resume()
  }

  return {
    isTuning: readonly(isTuning),
    candidateMidi: readonly(candidateMidi),
    progress: readonly(progress),
    lastReach: readonly(lastReach),
    start,
    cancel: stopTuning,
  }
}

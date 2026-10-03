import type { NoteInfo } from '@/utils/noteUtils'

type PitchSource = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  isClean: Readonly<Ref<boolean>>
}

/*
 * The detected pitch with the metronome's own tick taken out. The mic runs raw
 * during a scored run, so through loudspeakers it hears each tick. The mic's
 * low-pass removes nearly all of it; this is the second line of defence, for
 * whatever a speaker or room leaves behind.
 *
 * While `isMasking` (a tick may be in the mic), a frame only counts when it is
 * clearly a voice: clean and on the keyboard, between `minFrequency` and
 * `maxFrequency`. Any other frame is skipped and the last pitch held, so the
 * line neither jumps nor flickers and the scorer keeps its state. Notes start
 * on beats, so a voice frame must still get through — hence a filter, not a
 * deaf period.
 */
export function useMetronomeMask(
  source: PitchSource,
  isMasking: Readonly<Ref<boolean>>,
  minFrequency: () => number,
  maxFrequency: () => number,
) {
  const frequency = ref(source.frequency.value)
  const noteInfo = shallowRef(source.noteInfo.value)
  const isClean = ref(source.isClean.value)

  /* Sync, so the scorer never reads a frame the mask was about to skip. */
  watch(
    [source.frequency, source.noteInfo, source.isClean, isMasking],
    () => {
      const hz = source.frequency.value
      const isVoice =
        source.isClean.value &&
        hz !== null &&
        hz >= minFrequency() &&
        hz <= maxFrequency()
      if (isMasking.value && !isVoice) return

      frequency.value = hz
      noteInfo.value = source.noteInfo.value
      isClean.value = source.isClean.value
    },
    { flush: 'sync' },
  )

  return { frequency, noteInfo, isClean }
}

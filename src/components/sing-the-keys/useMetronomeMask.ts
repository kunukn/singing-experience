import type { NoteInfo } from '@/utils/noteUtils'

type PitchSource = {
  frequency: Readonly<Ref<number | null>>
  noteInfo: Readonly<Ref<NoteInfo | null>>
  isClean: Readonly<Ref<boolean>>
}

/*
 * The detected pitch with the metronome's own thud taken out. The mic runs raw
 * during a scored run, so through loudspeakers it hears each thud, and the
 * detector reports it as a pitch far below the keyboard: the sung line would
 * jump to the left edge on every beat.
 *
 * While `isMasking` (a thud may be in the mic), a frame only counts when it is
 * clearly a voice: clean and at or above `minFrequency`, the keyboard's lowest
 * key. Any other frame is skipped and the last pitch held, so the line neither
 * jumps nor flickers and the scorer keeps its state. Notes start on beats, so
 * a voice frame must still get through — hence a filter, not a deaf period.
 */
export function useMetronomeMask(
  source: PitchSource,
  isMasking: Readonly<Ref<boolean>>,
  minFrequency: () => number,
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
        source.isClean.value && hz !== null && hz >= minFrequency()
      if (isMasking.value && !isVoice) return

      frequency.value = hz
      noteInfo.value = source.noteInfo.value
      isClean.value = source.isClean.value
    },
    { flush: 'sync' },
  )

  return { frequency, noteInfo, isClean }
}

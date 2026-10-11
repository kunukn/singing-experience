import type { NoteInfo } from '@/utils/noteUtils'
import { CLOSE_CENTS } from '@/utils/pitchColors'

/* How long a note must hold steady before the match is taken — long enough to
 * average out vibrato, short enough to catch on one sustained note of a song */
export const MATCH_WINDOW_MS = 1500

type UseReferencePitchMatchOptions = {
  noteInfo: MaybeRefOrGetter<NoteInfo | null>
  isClean: MaybeRefOrGetter<boolean>
  referenceA4: MaybeRefOrGetter<number>
}

type MatchSample = { time: number; cents: number }

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle]
}

/**
 * "Match a recording": listen to one held note of a song and work out the A4
 * the recording is tuned to.
 *
 * The detector already measures cents against the *current* reference, so the
 * recording's reference is `current · 2^(medianCents / 1200)` — correct from any
 * starting setting and from any steady note, not only an A.
 */
export function useReferencePitchMatch(options: UseReferencePitchMatchOptions) {
  const isCapturing = ref(false)
  const samples = shallowRef<MatchSample[]>([])
  const resultHz = ref<number | null>(null)

  /* Reference the cents were measured against, frozen at capture start */
  let baseReferenceA4 = toValue(options.referenceA4)
  let capturedMidiNote: number | null = null

  const medianCents = computed(() =>
    samples.value.length > 0
      ? median(samples.value.map((sample) => sample.cents))
      : null,
  )

  const progress = computed(() => {
    if (resultHz.value !== null) return 1

    const list = samples.value
    if (list.length < 2) return 0

    return Math.min(
      1,
      (list[list.length - 1].time - list[0].time) / MATCH_WINDOW_MS,
    )
  })

  /* Live estimate while capturing, the locked result once complete */
  const estimateHz = computed(() => {
    if (resultHz.value !== null) return resultHz.value
    if (medianCents.value === null) return null

    return clampReferencePitch(
      baseReferenceA4 * Math.pow(2, medianCents.value / 1200),
    )
  })

  function restart() {
    samples.value = []
    capturedMidiNote = null
  }

  function addFrame(noteInfo: NoteInfo | null, isClean: boolean) {
    if (!isCapturing.value) return

    if (!noteInfo || !isClean) {
      restart()
      return
    }

    /* A new note means the singer/recording moved on — start over on it */
    if (capturedMidiNote !== null && noteInfo.midiNote !== capturedMidiNote) {
      restart()
    }

    capturedMidiNote = noteInfo.midiNote
    let next = [...samples.value, { time: Date.now(), cents: noteInfo.cents }]

    /* Slide the window start forward until the held note is steady within
     * CLOSE_CENTS — a wobbly attack is dropped instead of failing the match */
    const spread = (list: MatchSample[]) => {
      const cents = list.map((sample) => sample.cents)

      return Math.max(...cents) - Math.min(...cents)
    }
    while (next.length > 1 && spread(next) > CLOSE_CENTS) next = next.slice(1)
    samples.value = next

    if (progress.value >= 1) {
      resultHz.value = estimateHz.value
      isCapturing.value = false
    }
  }

  /* Sync flush: each detector frame is one sample, none may be coalesced */
  watch(
    () => [toValue(options.noteInfo), toValue(options.isClean)] as const,
    ([noteInfo, isClean]) => addFrame(noteInfo, isClean),
    { flush: 'sync' },
  )

  function begin() {
    baseReferenceA4 = toValue(options.referenceA4)
    resultHz.value = null
    restart()
    isCapturing.value = true
  }

  function cancel() {
    isCapturing.value = false
    resultHz.value = null
    restart()
  }

  return {
    isCapturing: readonly(isCapturing),
    progress,
    medianCents,
    estimateHz,
    resultHz: readonly(resultHz),
    begin,
    cancel,
  }
}

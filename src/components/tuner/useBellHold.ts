import type { MaybeRefOrGetter } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'

type LiveReading = {
  noteInfo: MaybeRefOrGetter<NoteInfo | null>
  frequency: MaybeRefOrGetter<number | null>
  isClean: MaybeRefOrGetter<boolean>
}

type HeldReading = { noteInfo: NoteInfo; frequency: number | null }

/**
 * Keeps the reading that rang the in-tune bell on screen while the bell sounds.
 *
 * The bell plays through the speaker, and its inharmonic FM partials mixed
 * with the string drop the detector's clarity under the gate. Without a hold,
 * the readout flips to "Listening…" at the moment of success and comes back
 * once the bell fades. A clean live reading always wins over the held one, so
 * the hold only fills the gaps the bell causes.
 */
export function useBellHold(live: LiveReading) {
  const held = shallowRef<HeldReading | null>(null)
  let releaseTimer: ReturnType<typeof setTimeout> | null = null

  function release() {
    clearTimeout(releaseTimer ?? undefined)
    releaseTimer = null
    held.value = null
  }

  function hold(durationMs: number) {
    const noteInfo = toValue(live.noteInfo)
    if (!noteInfo || !toValue(live.isClean)) return

    held.value = { noteInfo, frequency: toValue(live.frequency) }
    clearTimeout(releaseTimer ?? undefined)
    releaseTimer = setTimeout(release, durationMs)
  }

  const isLiveClean = computed(
    () => toValue(live.isClean) && toValue(live.noteInfo) != null,
  )

  const noteInfo = computed(() =>
    isLiveClean.value
      ? toValue(live.noteInfo)
      : (held.value?.noteInfo ?? toValue(live.noteInfo)),
  )

  const frequency = computed(() =>
    isLiveClean.value || !held.value
      ? toValue(live.frequency)
      : held.value.frequency,
  )

  const isClean = computed(() => isLiveClean.value || held.value != null)

  onScopeDispose(release)

  return { noteInfo, frequency, isClean, hold, release }
}

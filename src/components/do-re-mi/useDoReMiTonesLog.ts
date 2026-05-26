import type { Ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'

export type DetectedTone = { note: string; ms: number }

type UseDoReMiTonesLogOptions = {
  /* The game's detected note (post-EMA detector output; already null on
   * silence/unclean). */
  noteInfo: Ref<NoteInfo | null>
  isPlaying: Ref<boolean>
  /* Elapsed ms since the run started. */
  elapsedMs: Ref<number>
}

const labelOf = (info: NoteInfo | null): string | null =>
  info ? `${info.note}${info.octave}` : null

/**
 * Debug-only instrument (single-channel mirror of the Singfly
 * useDetectedTonesLog): records every new tone the player produces during a
 * playing run. A tone is "new" when its note+octave label differs from the
 * previous one (consecutive-distinct); silence breaks the run, so a note sung
 * again after a gap is logged as a fresh occurrence. Each new tone is
 * `debugLog`-ed with the elapsed-ms timestamp and pushed to the array; the
 * array dumps as a summary at run end. `debugLog` is a no-op unless
 * VITE_DEBUG_LOG=1, so this is free in normal runs.
 */
export function useDoReMiTonesLog(options: UseDoReMiTonesLogOptions) {
  const { noteInfo, isPlaying, elapsedMs } = options

  const tones = ref<DetectedTone[]>([])
  /* Last logged label — plain var, not reactive (gate only). */
  let previousLabel: string | null = null

  watch(isPlaying, (playing) => {
    if (playing) {
      tones.value = []
      previousLabel = null
      return
    }

    /* Run end — dump the run for after-the-fact inspection. */
    if (tones.value.length > 0)
      debugLog('[DoReMiTones] round summary', tones.value)
  })

  watch(noteInfo, (info) => {
    if (!isPlaying.value) return

    const label = labelOf(info)
    if (label === null) {
      /* Silence breaks the run so the same note sung again re-logs. */
      previousLabel = null
      return
    }

    if (label === previousLabel) return

    previousLabel = label
    const ms = Math.round(elapsedMs.value)
    tones.value.push({ note: label, ms })
    debugLog('[DoReMiTones]', label, ms)
  })

  return { tones }
}

import type { Ref } from 'vue'
import type { NoteInfo } from '@/utils/noteUtils'

export type DetectedTone = { note: string; ms: number }

type UseDetectedTonesLogOptions = {
  /* Raw detection output (mic or simulated) — every flicker/octave spike. */
  rawNoteInfo: Ref<NoteInfo | null>
  /* De-flickered pitch the game actually scores against. */
  stableNoteInfo: Ref<NoteInfo | null>
  /* Pitch-bird smoothed pitch (where the bird sits). */
  smoothNoteInfo: Ref<NoteInfo | null>
  isPlaying: Ref<boolean>
  /* Elapsed ms since round start; also correct on the manual-clock test page. */
  elapsedMs: Ref<number>
}

const labelOf = (info: NoteInfo | null): string | null =>
  info ? `${info.note}${info.octave}` : null

/**
 * Debug-only instrument: records every new tone the player produces during a
 * playing round, on three parallel channels (raw / stable / smooth) so they
 * can be compared. A tone is "new" when its note+octave label differs from the
 * previous one on that channel (consecutive-distinct); silence breaks the run,
 * so a note sung again after a gap is logged as a fresh occurrence. Each new
 * tone is `debugLog`-ed with the elapsed-ms timestamp and pushed to the
 * channel's array; the array dumps as a summary at round end. `debugLog` is a
 * no-op unless VITE_DEBUG_LOG=1, so this is free in normal runs.
 */
export function useDetectedTonesLog(options: UseDetectedTonesLogOptions) {
  const { isPlaying, elapsedMs } = options

  const rawTones = ref<DetectedTone[]>([])
  const stableTones = ref<DetectedTone[]>([])
  const smoothTones = ref<DetectedTone[]>([])

  const channels = [
    { tag: 'raw', source: options.rawNoteInfo, tones: rawTones },
    { tag: 'stable', source: options.stableNoteInfo, tones: stableTones },
    { tag: 'smooth', source: options.smoothNoteInfo, tones: smoothTones },
  ] as const

  /* Per-channel last logged label — plain vars, not reactive (gate only). */
  const previousLabel: Record<string, string | null> = {
    raw: null,
    stable: null,
    smooth: null,
  }

  function reset() {
    for (const { tag, tones } of channels) {
      tones.value = []
      previousLabel[tag] = null
    }
  }

  watch(isPlaying, (playing) => {
    if (playing) {
      reset()
      return
    }

    /* Round end — dump each channel's run for after-the-fact inspection. */
    for (const { tag, tones } of channels) {
      if (tones.value.length > 0)
        debugLog(`[SingFlyTones:${tag}] round summary`, tones.value)
    }
  })

  for (const { tag, source, tones } of channels) {
    watch(source, (info) => {
      if (!isPlaying.value) return

      const label = labelOf(info)
      if (label === null) {
        /* Silence breaks the run so the same note sung again re-logs. */
        previousLabel[tag] = null
        return
      }

      if (label === previousLabel[tag]) return

      previousLabel[tag] = label
      const ms = Math.round(elapsedMs.value)
      tones.value.push({ note: label, ms })
      debugLog(`[SingFlyTones:${tag}]`, label, ms)
    })
  }

  return { rawTones, stableTones, smoothTones }
}

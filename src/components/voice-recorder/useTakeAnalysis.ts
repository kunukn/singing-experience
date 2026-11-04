import { analyzeTake, type TakeAnalysis } from './analyzeTake'
import type { TakeSource } from './pitchTrack'

export type TakeAnalysisStatus = 'idle' | 'analyzing' | 'ready' | 'failed'

/* savedAnalysis restores results from an earlier visit without re-reading audio. */
export function useTakeAnalysis(savedAnalysis: TakeAnalysis | null = null) {
  const status = ref<TakeAnalysisStatus>(savedAnalysis ? 'ready' : 'idle')
  const progress = ref(0)
  const analysis = shallowRef<TakeAnalysis | null>(savedAnalysis)

  let controller: AbortController | null = null

  async function run(
    loadSource: () => Promise<TakeSource>,
    options: { hasAutoGain?: boolean } = {},
  ): Promise<TakeAnalysis | null> {
    controller?.abort()
    const current = new AbortController()
    controller = current

    status.value = 'analyzing'
    progress.value = 0
    analysis.value = null

    try {
      const source = await loadSource()
      const result = await analyzeTake(source, {
        signal: current.signal,
        hasAutoGain: options.hasAutoGain,
        onProgress: (ratio) => {
          progress.value = ratio
        },
      })

      if (current.signal.aborted) return null

      analysis.value = result
      status.value = 'ready'

      return result
    } catch {
      /* Decoding can fail on a damaged or unusual file. Playback still works, so
       * the take isn't lost. */
      if (!current.signal.aborted) status.value = 'failed'

      return null
    }
  }

  onScopeDispose(() => controller?.abort())

  return {
    status: readonly(status),
    progress: readonly(progress),
    analysis,
    run,
  }
}

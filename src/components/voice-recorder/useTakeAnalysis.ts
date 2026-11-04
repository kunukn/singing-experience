import { analyzeTake, type TakeAnalysis } from './analyzeTake'
import type { TakeSource } from './pitchTrack'

export type TakeAnalysisStatus = 'idle' | 'analyzing' | 'ready' | 'failed'

export function useTakeAnalysis() {
  const status = ref<TakeAnalysisStatus>('idle')
  const progress = ref(0)
  const analysis = shallowRef<TakeAnalysis | null>(null)

  let controller: AbortController | null = null

  async function run(
    loadSource: () => Promise<TakeSource>,
    options: { hasAutoGain?: boolean } = {},
  ) {
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

      if (current.signal.aborted) return

      analysis.value = result
      status.value = 'ready'
    } catch {
      /* Decoding can fail on a damaged or unusual file. Playback still works, so
       * the take isn't lost. */
      if (!current.signal.aborted) status.value = 'failed'
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

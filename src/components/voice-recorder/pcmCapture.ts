/*
 * MediaRecorder only writes lossy AAC or Opus, so lossless takes need the raw
 * samples. This AudioWorklet processor copies each 128-sample block off the
 * audio thread to the page; it writes nothing to its output, so the speakers
 * stay silent.
 */
export const PCM_CAPTURE_PROCESSOR = 'pcm-capture'

/*
 * Plain JavaScript loaded from a Blob URL, as Tone.js loads its worklets, so
 * the bundler needs no worklet setup. The copy's buffer is transferred, not
 * cloned.
 */
const PROCESSOR_SOURCE = `
class PcmCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0]?.[0]
    if (channel) {
      const copy = channel.slice()
      this.port.postMessage(copy, [copy.buffer])
    }

    return true
  }
}

registerProcessor('${PCM_CAPTURE_PROCESSOR}', PcmCaptureProcessor)
`

export async function loadPcmCaptureProcessor(
  context: BaseAudioContext,
): Promise<void> {
  const url = URL.createObjectURL(
    new Blob([PROCESSOR_SOURCE], { type: 'text/javascript' }),
  )

  try {
    await context.audioWorklet.addModule(url)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export type SampleCollector = {
  /* False once the limit is reached; samples past it are dropped. */
  append: (chunk: Float32Array) => boolean
  join: () => Float32Array
}

/* Grows block by block rather than reserving a full minute, since most takes
 * last a few seconds. */
export function createSampleCollector(maxSamples: number): SampleCollector {
  const chunks: Float32Array[] = []
  let length = 0

  return {
    append(chunk) {
      const room = maxSamples - length
      if (room <= 0) return false

      const kept = chunk.length > room ? chunk.subarray(0, room) : chunk
      chunks.push(kept)
      length += kept.length

      return length < maxSamples
    },
    join() {
      const samples = new Float32Array(length)
      let offset = 0
      for (const chunk of chunks) {
        samples.set(chunk, offset)
        offset += chunk.length
      }

      return samples
    },
  }
}

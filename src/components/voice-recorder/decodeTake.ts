import { ANALYSIS_SAMPLE_RATE, type TakeSource } from './pitchTrack'

/*
 * decodeAudioData resamples to its context's rate, so decoding through a small
 * offline context costs about 26 MB for 5 minutes instead of 115 MB at 48 kHz
 * stereo. The context never renders: it's only here for that decoder.
 */
export async function decodeTake(blob: Blob): Promise<TakeSource> {
  const context = new OfflineAudioContext(1, 1, ANALYSIS_SAMPLE_RATE)
  const buffer = await context.decodeAudioData(await blob.arrayBuffer())

  if (buffer.numberOfChannels === 1) {
    return { samples: buffer.getChannelData(0), sampleRate: buffer.sampleRate }
  }

  const samples = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel)
    for (let i = 0; i < samples.length; i++) {
      samples[i] += channelData[i] / buffer.numberOfChannels
    }
  }

  return { samples, sampleRate: buffer.sampleRate }
}

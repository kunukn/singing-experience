/*
 * The small download: the WAV take re-encoded as AAC in an .m4a file, which
 * opens in music and messaging apps everywhere. Mediabunny is loaded on first
 * use, so singers who only keep the WAV never download it.
 */

export const SMALL_FILE_MIME_TYPE = 'audio/mp4'
/* About 1 MB a minute. For one voice, AAC at this rate is hard to tell from
 * the WAV. */
const SMALL_FILE_BITS_PER_SECOND = 128_000

/* For the button label before the file exists. The MP4 wrapper adds only a
 * few kB on top. */
export function estimateSmallFileBytes(durationSeconds: number): number {
  return (durationSeconds * SMALL_FILE_BITS_PER_SECOND) / 8
}

let isAacEncoderRegistered = false

/*
 * Browsers without a WebCodecs AAC encoder, mainly Firefox, get a WASM build of
 * FFmpeg's. It's about 1.1 MB, so it's fetched only when needed and kept out of
 * the offline precache (see vite.config.ts).
 */
async function ensureAacEncoder(canEncodeNatively: () => Promise<boolean>) {
  if (isAacEncoderRegistered || (await canEncodeNatively())) return

  const { registerAacEncoder } = await import('@mediabunny/aac-encoder')
  registerAacEncoder()
  isAacEncoderRegistered = true
}

/* Takes are always WAV here: older compressed takes don't offer this. */
export async function compressTake(wavBlob: Blob): Promise<Blob> {
  const {
    BlobSource,
    BufferTarget,
    canEncodeAudio,
    Conversion,
    Input,
    Mp4OutputFormat,
    Output,
    Quality,
    WAVE,
  } = await import('mediabunny')

  const quality = new Quality({ bitrate: SMALL_FILE_BITS_PER_SECOND })
  await ensureAacEncoder(() =>
    canEncodeAudio('aac', { numberOfChannels: 1, quality }),
  )

  const output = new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  })
  const conversion = await Conversion.init({
    input: new Input({ source: new BlobSource(wavBlob), formats: [WAVE] }),
    output,
    audio: { codec: 'aac', quality },
    showWarnings: false,
  })
  if (!conversion.isValid) throw new Error('Take could not be converted to AAC')

  await conversion.execute()
  if (!output.target.buffer) throw new Error('AAC conversion produced no file')

  return new Blob([output.target.buffer], { type: SMALL_FILE_MIME_TYPE })
}

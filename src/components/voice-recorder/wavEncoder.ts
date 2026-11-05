const HEADER_BYTES = 44

export type WavBitDepth = 16 | 24

/*
 * Mono integer PCM. Plain format tag 1 even at 24-bit: the extensible header
 * the spec suggests above 16 bits is not needed by browsers, DAWs or players.
 */
export function encodeWav(
  samples: Float32Array,
  sampleRate: number,
  bitsPerSample: WavBitDepth = 16,
): Blob {
  const bytesPerSample = bitsPerSample / 8
  /* Largest positive sample: 32767 at 16-bit, 8388607 at 24-bit. */
  const maxValue = 2 ** (bitsPerSample - 1) - 1
  const dataBytes = samples.length * bytesPerSample
  const bytes = new Uint8Array(HEADER_BYTES + dataBytes)
  const view = new DataView(bytes.buffer)

  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i))
    }
  }

  writeText(0, 'RIFF')
  view.setUint32(4, HEADER_BYTES - 8 + dataBytes, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true) // size of the format chunk
  view.setUint16(20, 1, true) // 1 = uncompressed PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, bitsPerSample, true)
  writeText(36, 'data')
  view.setUint32(40, dataBytes, true)

  for (let i = 0; i < samples.length; i++) {
    const sample = Math.max(-1, Math.min(1, samples[i]))
    const value = Math.round(sample * maxValue)
    const offset = HEADER_BYTES + i * bytesPerSample

    /* Little-endian two's complement: >> keeps the sign, & 0xff takes a byte. */
    for (let byte = 0; byte < bytesPerSample; byte++) {
      bytes[offset + byte] = (value >> (8 * byte)) & 0xff
    }
  }

  return new Blob([bytes], { type: 'audio/wav' })
}

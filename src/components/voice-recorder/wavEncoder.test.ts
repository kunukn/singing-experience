import { describe, expect, test } from 'vitest'

import { encodeWav } from './wavEncoder'

async function readBytes(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())

  return { bytes, view: new DataView(bytes.buffer) }
}

describe('wavEncoder', () => {
  test('writes a 24-bit mono header', async () => {
    const { view } = await readBytes(encodeWav(new Float32Array(10), 48000, 24))

    expect(view.getUint16(22, true)).toBe(1) // channels
    expect(view.getUint32(24, true)).toBe(48000) // sample rate
    expect(view.getUint32(28, true)).toBe(48000 * 3) // byte rate
    expect(view.getUint16(32, true)).toBe(3) // block align
    expect(view.getUint16(34, true)).toBe(24) // bits per sample
    expect(view.getUint32(40, true)).toBe(30) // data bytes
  })

  test('writes 24-bit samples as little-endian, clamped to full scale', async () => {
    const { bytes } = await readBytes(
      encodeWav(Float32Array.from([1, -1, 0, 2]), 48000, 24),
    )

    const expectedPerSample = [
      [0xff, 0xff, 0x7f], // 8388607
      [0x01, 0x00, 0x80], // -8388607
      [0x00, 0x00, 0x00], // 0
      [0xff, 0xff, 0x7f], // 2 clamps to 1
    ]

    expect([...bytes.subarray(44)]).toEqual(expectedPerSample.flat())
  })

  test('defaults to 16-bit', async () => {
    const { view } = await readBytes(encodeWav(Float32Array.from([1]), 48000))

    expect(view.getUint16(34, true)).toBe(16)
    expect(view.getInt16(44, true)).toBe(32767)
  })
})

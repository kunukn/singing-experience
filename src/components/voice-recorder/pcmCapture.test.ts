import { describe, expect, test } from 'vitest'

import { createSampleCollector } from './pcmCapture'

describe('pcmCapture - createSampleCollector', () => {
  test('joins blocks in the order they arrived', () => {
    const collector = createSampleCollector(10)

    collector.append(Float32Array.from([1, 2]))
    collector.append(Float32Array.from([3]))

    expect([...collector.join()]).toEqual([1, 2, 3])
  })

  test('reports full and drops samples past the limit', () => {
    const collector = createSampleCollector(3)

    expect(collector.append(Float32Array.from([1, 2]))).toBe(true)
    expect(collector.append(Float32Array.from([3, 4]))).toBe(false)
    expect(collector.append(Float32Array.from([5]))).toBe(false)
    expect([...collector.join()]).toEqual([1, 2, 3])
  })
})

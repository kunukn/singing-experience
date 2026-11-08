import { describe, expect, test } from 'vitest'
import {
  WAVE_VIEWBOX_HEIGHT,
  WAVE_VIEWBOX_WIDTH,
  wavePath,
} from './ambientWave'

const mid = WAVE_VIEWBOX_HEIGHT / 2

describe('wavePath', () => {
  test('starts and ends on the midline across the full width', () => {
    const path = wavePath(3, 10)

    expect(path.startsWith(`M0,${mid} `)).toBe(true)
    expect(path.endsWith(`T${WAVE_VIEWBOX_WIDTH},${mid}`)).toBe(true)
  })

  test.each([1, 2, 5])(
    'draws two half-periods per period in both halves for %i periods',
    (periods) => {
      const segmentCount = wavePath(periods, 10).split(/[QT]/).length - 1

      expect(segmentCount).toBe(periods * 2 * 2)
    },
  )

  test('passes the midline at the halfway point so the -50% loop is seamless', () => {
    expect(wavePath(3, 10)).toContain(` T${WAVE_VIEWBOX_WIDTH / 2},${mid}`)
  })

  test('places the first control point at twice the amplitude', () => {
    expect(wavePath(2, 10)).toContain(`Q150,${mid - 20} 300,${mid}`)
  })
})

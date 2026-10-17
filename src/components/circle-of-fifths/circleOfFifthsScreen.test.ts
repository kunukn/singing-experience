import { describe, expect, test } from 'vitest'
import { toCircleScreen } from './circleOfFifthsScreen'

describe('circleOfFifthsScreen', () => {
  test.each([
    { phase: 'idle', mode: 'walk', screen: 'walkIdle' },
    { phase: 'idle', mode: 'explore', screen: 'exploreIdle' },
    { phase: 'walking', mode: 'walk', screen: 'walking' },
    { phase: 'walkComplete', mode: 'walk', screen: 'walkComplete' },
    { phase: 'patternSinging', mode: 'explore', screen: 'patternSinging' },
    /* A round keeps its screen even if the mode were to flip under it */
    { phase: 'walking', mode: 'explore', screen: 'walking' },
    { phase: 'walkComplete', mode: 'explore', screen: 'walkComplete' },
    { phase: 'patternSinging', mode: 'walk', screen: 'patternSinging' },
  ] as const)(
    'maps $phase in $mode mode to $screen',
    ({ phase, mode, screen }) => {
      expect(toCircleScreen(phase, mode)).toBe(screen)
    },
  )
})

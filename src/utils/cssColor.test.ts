import { describe, expect, test } from 'vitest'
import { withAlpha } from './cssColor'

/* resolveCssColor is deliberately untested: jsdom does not implement
 * light-dark(), so a passing test there would prove nothing about the browser
 * behaviour this module exists to work around. */

describe('withAlpha', () => {
  test('adds an alpha to a resolved rgb() colour', () => {
    expect(withAlpha('rgb(51, 65, 85)', 0.5)).toBe('rgba(51, 65, 85, 0.5)')
  })

  test('replaces an existing alpha rather than appending a fourth channel', () => {
    expect(withAlpha('rgba(51, 65, 85, 0.2)', 0.9)).toBe(
      'rgba(51, 65, 85, 0.9)',
    )
  })

  test('accepts the modern space-separated form', () => {
    expect(withAlpha('rgb(51 65 85)', 0.25)).toBe('rgba(51, 65, 85, 0.25)')
  })

  test('tolerates surrounding whitespace', () => {
    expect(withAlpha('  rgb(51, 65, 85)  ', 0.5)).toBe('rgba(51, 65, 85, 0.5)')
  })

  /* The regression this module was written for: an unparseable value used to
   * become "rgba(NaN, NaN, -13, 0.9)", which the canvas silently ignores. */
  test('returns unrecognised colours unchanged instead of emitting NaN', () => {
    expect(withAlpha('light-dark(#ffffff, #18181b)', 0.9)).toBe(
      'light-dark(#ffffff, #18181b)',
    )
    expect(withAlpha('', 0.9)).toBe('')
  })
})

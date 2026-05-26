import { afterEach, describe, expect, test, vi } from 'vitest'

/*
 * The composable captures PWA state ONCE at module import, so each case
 * stubs the environment, resets the module registry, then dynamically
 * re-imports so the singleton re-evaluates against the stubs.
 */
const originalLocation = window.location
const originalMatchMedia = window.matchMedia

type Scenario = {
  search?: string
  iosStandalone?: boolean
  /* display-mode values whose media query should report matches: true */
  displayModes?: string[]
}

async function loadWith({
  search = '',
  iosStandalone = false,
  displayModes = [],
}: Scenario): Promise<boolean> {
  Object.defineProperty(window, 'location', {
    value: { search },
    configurable: true,
  })
  Object.defineProperty(window.navigator, 'standalone', {
    value: iosStandalone,
    configurable: true,
  })
  window.matchMedia = ((query: string) =>
    ({
      matches: displayModes.some((mode) => query.includes(mode)),
    }) as MediaQueryList) as typeof window.matchMedia

  vi.resetModules()
  const { useIsInstalledPwa } = await import('./useIsInstalledPwa')
  return useIsInstalledPwa()
}

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    configurable: true,
  })
  window.matchMedia = originalMatchMedia
})

describe('useIsInstalledPwa', () => {
  test('true when launched via the start_url marker (?mode=pwa)', async () => {
    expect(await loadWith({ search: '?mode=pwa' })).toBe(true)
  })

  test('true for an iOS Safari home-screen app', async () => {
    expect(await loadWith({ iosStandalone: true })).toBe(true)
  })

  test('true when display-mode is standalone', async () => {
    expect(await loadWith({ displayModes: ['standalone'] })).toBe(true)
  })

  test('true when display-mode is minimal-ui', async () => {
    expect(await loadWith({ displayModes: ['minimal-ui'] })).toBe(true)
  })

  test('false on a plain website (display-mode: browser)', async () => {
    expect(await loadWith({ displayModes: ['browser'] })).toBe(false)
  })

  test('false when only display-mode: fullscreen matches — a normal site that called requestFullscreen()', async () => {
    expect(await loadWith({ displayModes: ['fullscreen'] })).toBe(false)
  })
})

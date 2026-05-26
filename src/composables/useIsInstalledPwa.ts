/*
 * Whether the app is running as an installed / launched PWA (home-screen
 * app, standalone or minimal-ui window) rather than a normal website tab.
 *
 * Captured ONCE at module import (app bootstrap), before the router can
 * rewrite the URL, and never recomputed. This is deliberate: the launch
 * context of a document is fixed for its lifetime, and a reactive check
 * would be wrong — the Fullscreen API makes `(display-mode: fullscreen)`
 * match on a normal site, which is exactly the false positive we must
 * avoid (see FullscreenToggle.vue).
 *
 * Stored in module memory, not localStorage, on purpose: localStorage is
 * shared across the normal tab and the PWA window on the same origin, so
 * persisting the flag would leak it into a normal tab. Module memory is
 * per-browsing-context, so the snapshot is correctly isolated for free.
 */
const isInstalledPwa = ((): boolean => {
  try {
    /*
     * Launch marker injected via the manifest start_url (./?mode=pwa).
     * The OS opens an installed PWA at start_url, so its document URL
     * carries this query; a normal website visited by URL never does.
     * This is the only reliable signal when display: 'fullscreen',
     * because a launched fullscreen PWA and a normal site that called
     * requestFullscreen() both report `display-mode: fullscreen`.
     */
    const fromLaunchUrl =
      new URLSearchParams(window.location.search).get('mode') === 'pwa'

    /* iOS Safari "Add to Home Screen" app (non-standard, iOS only). */
    const fromIosStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true

    /*
     * standalone / minimal-ui are never produced by the Fullscreen API,
     * so they unambiguously mean an installed PWA. `fullscreen` is
     * intentionally excluded here — it is ambiguous and handled by the
     * launch-url marker above.
     */
    const fromDisplayMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches

    return fromLaunchUrl || fromIosStandalone || fromDisplayMode
  } catch {
    return false
  }
})()

if (isInstalledPwa && typeof document !== 'undefined') {
  /* Lets CSS react to PWA mode via [data-pwa] if ever needed. */
  document.documentElement.dataset.pwa = ''
}

export function useIsInstalledPwa(): boolean {
  return isInstalledPwa
}

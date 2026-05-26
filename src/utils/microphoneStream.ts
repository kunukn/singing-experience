/*
 * Single entry point for acquiring a microphone MediaStream.
 *
 * Why this exists: on iOS/iPadOS Safari (WebKit), getUserMedia() cannot present
 * its permission prompt while the document is in Fullscreen API fullscreen —
 * the call silently stalls until the user manually exits fullscreen. So a user
 * who enters fullscreen and then clicks a Start button sees nothing happen.
 *
 * Only the FIRST getUserMedia() of a page instance can prompt. Once a stream
 * has been acquired in the current document, every later call resolves
 * silently and is fullscreen-safe. We track that first-call state ourselves
 * (module memory) rather than relying on the unreliable iOS Permissions API.
 */

/*
 * Per-browsing-context module memory (same pattern as useIsInstalledPwa.ts):
 * survives SPA navigation, resets only on a real page load. Set true after any
 * successful acquisition — after that no prompt can appear, so the guard below
 * becomes a no-op for the rest of the page instance.
 */
let hasAcquiredMicStreamThisPageInstance = false

/*
 * The fullscreen + permission-prompt deadlock is WebKit/iOS-only; desktop and
 * Android show the prompt fine over fullscreen, so they must NOT be bounced out
 * of fullscreen. Captured once at module load — the launch platform is fixed
 * for the document's lifetime. The MacIntel + maxTouchPoints clause catches
 * iPadOS 13+, which masquerades as desktop Safari.
 */
const isAffectedPlatform = ((): boolean => {
  try {
    return (
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
  } catch {
    return false
  }
})()

/*
 * enumerateDevices() never prompts: a non-empty audioinput label means we
 * currently hold an active mic grant for THIS document. Used both to skip the
 * fullscreen exit when a returning user still has a live grant, and by
 * useMicrophonePermission to derive a reliable 'granted' state on iOS.
 */
export async function hasActiveMicGrant(): Promise<boolean> {
  if (!navigator.mediaDevices?.enumerateDevices) return false

  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices.some(
      (device) => device.kind === 'audioinput' && device.label !== '',
    )
  } catch {
    return false
  }
}

/**
 * Acquire a microphone stream, first exiting fullscreen on iOS/iPadOS when a
 * permission prompt is genuinely pending (so the prompt can actually render).
 * All app code that needs the mic must go through this — never call
 * navigator.mediaDevices.getUserMedia directly.
 */
export async function acquireMicStream(
  constraints: MediaStreamConstraints,
): Promise<MediaStream> {
  if (
    !hasAcquiredMicStreamThisPageInstance &&
    isAffectedPlatform &&
    document.fullscreenElement &&
    !(await hasActiveMicGrant())
  ) {
    /*
     * Exiting needs no user gesture (only entering does). Awaiting the promise
     * waits for the fullscreen transition to finish before the prompt is
     * needed. Guarded by fullscreenElement + try/catch so a spurious reject
     * (e.g. already exited) never blocks acquisition.
     */
    try {
      await document.exitFullscreen()
    } catch {
      /* not in fullscreen / exit rejected — proceed to request anyway */
    }
  }

  const stream = await navigator.mediaDevices.getUserMedia(constraints)
  hasAcquiredMicStreamThisPageInstance = true

  return stream
}

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

/* Streams handed out and not yet released. The audio session may only leave
 * play-and-record once this is empty: 'playback' cuts any capture still live. */
const liveMicStreams = new Set<MediaStream>()

type AudioSessionType = 'auto' | 'playback' | 'play-and-record'

/*
 * Audio Session API — WebKit only (Safari 16.4+), a no-op elsewhere.
 *
 * iOS has one audio session per page. Opening the mic moves it to
 * play-and-record, which plays the synths at quiet call level, and under the
 * default 'auto' WebKit leaves it there after the mic closes while Tone's
 * context is still running — so the piano stayed quiet until a reload. Setting
 * the type explicitly makes iOS re-pick the category at once.
 */
function setAudioSessionType(type: AudioSessionType) {
  const session = (navigator as Navigator & { audioSession?: { type: string } })
    .audioSession
  if (!session) return

  try {
    session.type = type
  } catch {
    /* rejected type — keep whatever the browser chose */
  }
}

/**
 * Acquire a microphone stream, first exiting fullscreen on iOS/iPadOS when a
 * permission prompt is genuinely pending (so the prompt can actually render).
 * All app code that needs the mic must go through this — never call
 * navigator.mediaDevices.getUserMedia directly. Hand the stream back through
 * releaseMicStream when done.
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

  /* Back to a capture-capable session: a previous release left it on 'playback',
   * which does not allow recording. */
  setAudioSessionType('play-and-record')

  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints)
  } catch (error) {
    if (liveMicStreams.size === 0) setAudioSessionType('playback')

    throw error
  }

  hasAcquiredMicStreamThisPageInstance = true
  liveMicStreams.add(stream)

  return stream
}

/**
 * Stop a stream from acquireMicStream and, once no stream is left, return the
 * audio session to playback so the synths play at full media volume again.
 * Never stop the tracks by hand — the session would stay in call mode.
 */
export function releaseMicStream(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop())
  liveMicStreams.delete(stream)

  if (liveMicStreams.size === 0) setAudioSessionType('playback')
}

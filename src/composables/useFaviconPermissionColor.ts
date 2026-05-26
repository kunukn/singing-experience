/*
 * Music note SVG path rendered inline so stroke color can be set dynamically.
 */
const NOTE_PATH =
  'M9 18c0 1.105-1.12 2-2.5 2S4 19.105 4 18s1.12-2 2.5-2 2.5.895 2.5 2zm0 0V7l11-3v11m0 0c0 1.105-1.12 2-2.5 2s-2.5-.895-2.5-2 1.12-2 2.5-2 2.5.895 2.5 2z'

// Tailwind green-400 / red-400 — match text-green-400 / text-red-400 in LandingPage.vue
const COLOR_GRANTED = '#4ade80'
const COLOR_DENIED = '#f87171'

function buildFaviconHref(color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"><path stroke="${color}" stroke-linejoin="round" stroke-width="2" d="${NOTE_PATH}"/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function getFaviconLink(): HTMLLinkElement | null {
  return document.querySelector<HTMLLinkElement>('link[rel="icon"]')
}

export function useFaviconPermissionColor() {
  const { state: micPermission } = useMicrophonePermission()

  // Capture the original static href so we can restore it for the default state.
  const originalHref = getFaviconLink()?.href ?? ''

  watch(
    micPermission,
    (state) => {
      const link = getFaviconLink()

      if (!link) return

      if (state === 'granted') {
        link.href = buildFaviconHref(COLOR_GRANTED)
      } else if (state === 'denied') {
        link.href = buildFaviconHref(COLOR_DENIED)
      } else {
        // null / 'prompt' — restore the original static SVG file
        link.href = originalHref
      }
    },
    { immediate: true },
  )
}

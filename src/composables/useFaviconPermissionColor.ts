/*
 * Brand mark from MusicNoteIcon.vue (and public/icons/note.svg) as a plain SVG
 * string: a data-URI favicon can't read CSS vars, so every shape takes one hex
 * colour and the tile is that colour at 16%, matching the in-app tile tint.
 */
function buildBrandNoteSvg(color: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" color="${color}">`,
    '<rect x="1" y="1" width="38" height="38" rx="10" fill="currentColor" fill-opacity="0.16"/>',
    '<ellipse cx="13.5" cy="29.5" rx="4" ry="3" transform="rotate(-20 13.5 29.5)" fill="currentColor"/>',
    '<ellipse cx="26.5" cy="26.5" rx="4" ry="3" transform="rotate(-20 26.5 26.5)" fill="currentColor"/>',
    '<path d="M17 29V13M30 26V10" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>',
    '<path d="M15.75 13.3 31.25 9.7" stroke="currentColor" stroke-width="4.5"/>',
    '</svg>',
  ].join('')
}

// green-500 / red-500 — mid shades that read on both light and dark browser tabs
const COLOR_GRANTED = '#22c55e'
const COLOR_DENIED = '#ef4444'

function buildFaviconHref(color: string): string {
  return `data:image/svg+xml,${encodeURIComponent(buildBrandNoteSvg(color))}`
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

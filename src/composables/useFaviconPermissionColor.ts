import { NOTE_HEADS, NOTE_STEMS_BEAM_PATH } from '@/components/icons/noteMark'

/*
 * Brand mark from noteMark.ts (and public/icons/note.svg) as a plain SVG
 * string: a data-URI favicon can't read CSS vars, so every shape takes one hex
 * colour and the tile is that colour at 16%, matching the in-app tile tint.
 */
function buildBrandNoteSvg(color: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" color="${color}">`,
    '<rect x="1" y="1" width="38" height="38" rx="10" fill="currentColor" fill-opacity="0.16"/>',
    ...NOTE_HEADS.map(
      (head) =>
        `<ellipse cx="${head.cx}" cy="${head.cy}" rx="${head.rx}" ry="${head.ry}" transform="${head.transform}" fill="currentColor"/>`,
    ),
    `<path d="${NOTE_STEMS_BEAM_PATH}" fill="currentColor"/>`,
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

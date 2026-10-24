import Aura from '@primeuix/themes/aura'

/* Aura's raw colour scales, e.g. palette.emerald['600'] === '#059669' */
const palette = Aura.primitive as unknown as Record<
  string,
  Record<string, string>
>

/* Card highlight colours: Aura surface-0 (light) and dark-scheme surface-100 (zinc) */
const LIGHT_HIGHLIGHT = '#ffffff'
const DARK_HIGHLIGHT = palette.zinc['100']

function readHue(style: string, token: string, shade: string): string {
  const match = style.match(
    new RegExp(`${token}:\\s*var\\(--p-([a-z]+)-${shade}\\)`),
  )
  if (!match) throw new Error(`Program icon is missing ${token}`)

  return match[1]
}

function hex(hue: string, shade: string): string {
  const value = palette[hue]?.[shade]
  if (!value) throw new Error(`Aura has no ${hue}-${shade}`)

  return value
}

/**
 * Turns a mounted ProgramIconTile `<svg>` into a standalone file for places
 * that can't load the app's CSS (the README). The PrimeVue vars become hex
 * tokens in a `<style>`, with a prefers-color-scheme block mirroring the
 * tile's `.p-dark` shades.
 */
export function toStandaloneSvg(renderedSvg: string): string {
  const style = renderedSvg.match(/<svg[^>]*\sstyle="([^"]*)"/)?.[1] ?? ''
  const hue = readHue(style, '--icon-strong-light', '600')
  const accentHue = readHue(style, '--icon-accent-light', '500')

  const tokens = [
    `svg { --icon-strong: ${hex(hue, '600')}; --icon-accent: ${hex(accentHue, '500')}; --icon-light: ${LIGHT_HIGHLIGHT}; }`,
    `@media (prefers-color-scheme: dark) { svg { --icon-strong: ${hex(hue, '400')}; --icon-accent: ${hex(accentHue, '400')}; --icon-light: ${DARK_HIGHLIGHT}; } }`,
  ].join('\n    ')

  const body = renderedSvg
    .replace(/[ \t]*<!--[\s\S]*?-->/g, '\n')
    /* data-* comes from dev tooling (code-inspector's data-insp-path), not the icon */
    .replace(/\sdata-[\w-]+="[^"]*"/g, '')
    .replace(
      /<svg\b[^>]*>/,
      (openTag) =>
        `${openTag
          .replace(/\s(?:class|style)="[^"]*"/g, '')
          .replace(
            '<svg',
            '<svg width="40" height="40"',
          )}\n  <style>\n    ${tokens}\n  </style>`,
    )
    .replace(
      'class="program-icon-tile"',
      'fill="var(--icon-strong)" fill-opacity="0.16"',
    )

  return `${body.replace(/^\s*\n/gm, '')}\n`
}

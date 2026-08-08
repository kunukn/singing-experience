/*
 * Resolving PrimeVue theme colours for <canvas>.
 *
 * A canvas needs a real colour string; it cannot read a CSS custom property. The
 * obvious route — getComputedStyle(document.documentElement).getPropertyValue(name)
 * — does NOT work here: the computed value of a custom property is its *specified*
 * value, so nothing inside it is evaluated. Since @primeuix/themes v3, the Aura
 * semantic tokens are written with the CSS light-dark() function, and that is
 * exactly what comes back, sometimes nested:
 *
 *   --p-text-color -> "light-dark(light-dark(#334155,#3f3f46),#ffffff)"
 *
 * Both failure modes downstream are silent, which is what made this hard to spot:
 * slicing that string as "#rrggbb" yields "rgba(NaN, NaN, -13, 0.9)", and assigning
 * an unparseable colour to ctx.fillStyle is a no-op — the canvas keeps whatever
 * colour it had, so shapes get painted in the previous drawing's colour instead.
 *
 * The fix is to let the browser do the evaluation. Assigning `color: var(--token)`
 * to a real element and reading `color` back gives a resolved rgb(), because
 * light-dark() picks its branch from the element's inherited color-scheme — which
 * a detached or :root-only lookup cannot provide.
 *
 * Do not "simplify" this back to getComputedStyle on :root.
 */

/* Toggled on <html> by useDarkMode, and what flips light-dark()'s branch. */
const DARK_CLASS = 'p-dark'

const colorCache = new Map<string, string>()
let cachedIsDark: boolean | null = null
let probeElement: HTMLSpanElement | null = null

function getProbeElement(): HTMLSpanElement {
  if (probeElement) return probeElement

  const element = document.createElement('span')
  element.style.display = 'none'
  /* Must be in the document: light-dark() resolves against the inherited
   * color-scheme, which a detached element does not have. */
  document.body.appendChild(element)
  probeElement = element

  return element
}

/*
 * Dev-only tripwire for the failure this module exists to prevent.
 *
 * Assigning a colour a canvas cannot parse is a silent no-op — the context keeps
 * its previous colour and carries on drawing, which is why the original bug
 * surfaced as note labels painted in the trace's colour rather than as any kind
 * of error. Nothing in the type system can catch it: both sides are `string`.
 *
 * So probe the resolved value once per cache miss and shout if the canvas
 * rejects it. Cheap (cache misses are rare) and stripped from production, but it
 * turns "the chart looks a bit odd" into a named variable and its raw value the
 * moment a theme upgrade changes a token's format again.
 */
let guardContext: CanvasRenderingContext2D | null | undefined

/* Two sentinels, not one: a single sentinel would misreport a token that
 * legitimately resolves to that very colour. A rejected value leaves fillStyle
 * on whichever sentinel preceded it, so only a value that fails against BOTH is
 * genuinely unparseable. */
const GUARD_SENTINELS = ['#ff00ff', '#00ff00'] as const

function warnIfCanvasRejects(name: string, resolved: string): void {
  if (guardContext === undefined) {
    guardContext = document.createElement('canvas').getContext('2d')
  }
  if (!guardContext) return

  const isRejected = GUARD_SENTINELS.every((sentinel) => {
    guardContext!.fillStyle = sentinel
    guardContext!.fillStyle = resolved

    return guardContext!.fillStyle === sentinel
  })
  if (!isRejected) return

  console.error(
    `[cssColor] Canvas rejected the resolved value of ${name}: "${resolved}". ` +
      `Anything drawn with it keeps the previous colour instead. This usually ` +
      `means a theme upgrade changed the token's format — see src/utils/cssColor.ts.`,
  )
}

/**
 * Resolve a CSS custom property to a canvas-usable colour, e.g.
 * `resolveCssColor('--p-text-color')` → `'rgb(51, 65, 85)'`.
 *
 * Results are cached and invalidated on dark-mode changes — these run inside
 * per-frame draw loops, and an uncached getComputedStyle forces a style recalc.
 */
export function resolveCssColor(name: string, fallback = '#000000'): string {
  /* Reading a class list costs no style recalc, unlike getComputedStyle, so this
   * guard is cheap enough to run on every call. */
  const isDark = document.documentElement.classList.contains(DARK_CLASS)
  if (isDark !== cachedIsDark) {
    colorCache.clear()
    cachedIsDark = isDark
  }

  const cached = colorCache.get(name)
  if (cached) return cached

  const probe = getProbeElement()
  /* Cleared first so an unknown variable leaves an empty value rather than the
   * previous lookup's colour. */
  probe.style.color = ''
  probe.style.color = `var(${name})`
  const resolved = getComputedStyle(probe).color.trim() || fallback

  if (import.meta.env.DEV) warnIfCanvasRejects(name, resolved)

  colorCache.set(name, resolved)

  return resolved
}

/* Captures the three channels of rgb()/rgba(), legacy comma form or modern space
 * form, ignoring any existing alpha after the third value. */
const RGB_PATTERN = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/

/**
 * Apply an alpha to a resolved `rgb()`/`rgba()` colour. Unrecognised input is
 * returned unchanged — opaque, but visible; the point is to never again emit a
 * string the canvas rejects into a silent no-op.
 */
export function withAlpha(color: string, alpha: number): string {
  const match = RGB_PATTERN.exec(color.trim())
  if (!match) return color

  return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`
}

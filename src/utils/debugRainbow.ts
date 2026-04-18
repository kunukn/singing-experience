/**
 * Initializes the rainbow CSS debugger for development/debugging.
 * Loads a resource that applies rainbow outlines to elements for visual debugging.
 */
export function initDebugRainbow(): void {
  if (!document.getElementById('rainbow-debugger')) {
    setTimeout(() => {
      // Lazy loaded resource for debugging CSS with rainbow outlines
      if (!document.getElementById('rainbow-debugger')) {
        const script = document.createElement('script')
        script.id = 'rainbow-debugger'
        script.src = '/rainbow.js'
        script.addEventListener('load', () => {
          console.debug('*** Rainbow CSS debugging loaded')
        })
        document.body.appendChild(script)
      }
    }, 0)
  }
}

/**
 * Initializes the rainbow CSS debugger for development/debugging.
 * Loads a resource that applies rainbow outlines to elements for visual debugging.
 * Toggle with Alt+Shift+R.
 */
export function initDebugRainbow(): void {
  const loadScript = () => {
    if (!document.getElementById('rainbow-debugger')) {
      const script = document.createElement('script')
      script.id = 'rainbow-debugger'
      script.src = `${import.meta.env.BASE_URL}rainbow.js`
      script.addEventListener('load', () => {
        console.debug('*** Rainbow CSS debugging loaded')
      })
      document.body.appendChild(script)
    }
  }

  setTimeout(loadScript, 0)
}

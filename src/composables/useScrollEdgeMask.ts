import type { Ref } from 'vue'

/* Which axis the element scrolls on. 'inline' is the row-of-controls case every
 * settings row uses; 'block' is a tall box like the guitar fretboard, where the
 * hidden content is below rather than beside. */
export type ScrollEdgeAxis = 'inline' | 'block'

/* Tracks whether a scrollable element can scroll further toward its start or
 * end, so callers can apply an edge fade only on the side(s) that actually have
 * hidden content. The inline axis is RTL-safe via Math.abs(scrollLeft). */
export function useScrollEdgeMask(
  elementRef: Readonly<Ref<HTMLElement | null>>,
  axis: ScrollEdgeAxis = 'inline',
) {
  const canScrollStart = ref(false)
  const canScrollEnd = ref(false)

  function updateScrollState() {
    const element = elementRef.value
    if (!element) return

    /* RTL: scrollLeft can be negative or reversed depending on engine — abs
     * normalizes it. scrollTop has no such quirk; the block axis does not flip. */
    const scrolled =
      axis === 'block' ? element.scrollTop : Math.abs(element.scrollLeft)
    const maxScroll =
      axis === 'block'
        ? element.scrollHeight - element.clientHeight
        : element.scrollWidth - element.clientWidth
    /* 1px tolerance for sub-pixel rounding. */
    canScrollStart.value = scrolled > 1
    canScrollEnd.value = maxScroll - scrolled > 1
  }

  let resizeObserver: ResizeObserver | null = null

  onMounted(() => {
    const element = elementRef.value
    if (!element) return

    updateScrollState()
    element.addEventListener('scroll', updateScrollState, { passive: true })
    resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(element)
  })

  onBeforeUnmount(() => {
    elementRef.value?.removeEventListener('scroll', updateScrollState)
    resizeObserver?.disconnect()
    resizeObserver = null
  })

  return { canScrollStart, canScrollEnd }
}

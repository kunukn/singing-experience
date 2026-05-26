import type { Ref } from 'vue'

/* Tracks whether a horizontally scrollable element can scroll further toward
 * its logical start or end, so callers can apply an edge fade only on the
 * side(s) that actually have hidden content. RTL-safe via Math.abs(scrollLeft). */
export function useScrollEdgeMask(
  elementRef: Readonly<Ref<HTMLElement | null>>,
) {
  const canScrollStart = ref(false)
  const canScrollEnd = ref(false)

  function updateScrollState() {
    const element = elementRef.value
    if (!element) return

    /* RTL: scrollLeft can be negative or reversed depending on engine — abs normalizes it. */
    const scrolled = Math.abs(element.scrollLeft)
    const maxScroll = element.scrollWidth - element.clientWidth
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

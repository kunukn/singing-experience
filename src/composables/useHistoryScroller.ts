import type { Ref } from 'vue'
import {
  getScrollThumb,
  offsetMsToScrollLeft,
  scrollLeftToOffsetMs,
  type PitchHistoryTimeScale,
} from '@/utils/pitchHistoryScroll'

type UseHistoryScrollerOptions = {
  /* The chart box the scroller covers — its width is one window of time */
  containerRef: Ref<HTMLElement | null>
  isRtl: Ref<boolean>
  /* False while the chart is live or replaying, when there is nothing to scroll */
  isEnabled: () => boolean
  /* How much time the chart shows at once */
  windowMs: number
}

/* px — how far a mouse may move before a press becomes a drag, so a slightly
 * wobbly click on the chart still counts as a click (same as useLaneScroll) */
const DRAG_THRESHOLD_PX = 6

/*
 * Scrolling back through a stopped time chart. The canvas shows one window but
 * keeps more, so the start would otherwise be out of reach. Native scrolling,
 * as in SingTheKeysLane: an invisible scroller over the canvas gives touch
 * momentum, trackpad, shift-wheel and arrow keys, and its scrollLeft drives
 * viewOffsetMs, which the canvas draws from.
 *
 * The chart binds `scrollerRef` and the handlers to an always-LTR
 * `overflow-x-auto` element holding a spacer `scrollSpacerWidthPx` wide, and
 * feeds the canvas's `timeScaleChange` into `handleTimeScaleChange`.
 */
export function useHistoryScroller(options: UseHistoryScrollerOptions) {
  const timeScale = ref<PitchHistoryTimeScale>({ pxPerMs: 0, scrollableMs: 0 })
  const viewOffsetMs = ref(0)
  const scrollerRef = ref<HTMLElement | null>(null)

  const isScrollable = computed(
    () =>
      options.isEnabled() &&
      timeScale.value.scrollableMs > 0 &&
      timeScale.value.pxPerMs > 0,
  )

  const scrollGeometry = computed(() => ({
    ...timeScale.value,
    isRtl: options.isRtl.value,
  }))

  /* Wide enough that the scroll range is exactly the extra history, at the
   * canvas's own scale, so the chart tracks the finger 1:1 */
  const scrollSpacerWidthPx = computed(
    () =>
      (options.containerRef.value?.clientWidth ?? 0) +
      timeScale.value.scrollableMs * timeScale.value.pxPerMs,
  )

  const scrollThumb = computed(() =>
    isScrollable.value
      ? getScrollThumb(
          viewOffsetMs.value,
          timeScale.value.scrollableMs,
          options.windowMs,
        )
      : null,
  )

  function handleTimeScaleChange(next: PitchHistoryTimeScale) {
    /* A new take, or a cleared one, opens at its newest moment */
    if (next.scrollableMs !== timeScale.value.scrollableMs)
      viewOffsetMs.value = 0
    timeScale.value = next
  }

  function handleScroll() {
    const element = scrollerRef.value
    if (!element) return

    viewOffsetMs.value = scrollLeftToOffsetMs(
      element.scrollLeft,
      scrollGeometry.value,
    )
  }

  /* Puts the scroller where viewOffsetMs says — on mount (newest view after
   * Stop), after a resize changes the scale, and after replay hands it back */
  watch(
    [scrollerRef, scrollSpacerWidthPx, scrollGeometry],
    async ([element]) => {
      if (!element) return

      /* The spacer's new width must be laid out before scrollLeft can reach it */
      await nextTick()
      const target = offsetMsToScrollLeft(
        viewOffsetMs.value,
        scrollGeometry.value,
      )
      /* 1 px slack: setting scrollLeft fires a scroll event, and sub-pixel
       * rounding would otherwise bounce the two back and forth */
      if (Math.abs(element.scrollLeft - target) > 1) element.scrollLeft = target
    },
  )

  /*
   * Mouse drag-to-scroll. A native scroller pans under touch and trackpad but
   * not under a mouse drag, and a plain wheel scrolls vertically, so a mouse
   * user would otherwise have no obvious way to scroll. Touch and pen are left
   * to the browser.
   */
  let dragPointerId: number | null = null
  let dragLastX = 0
  let dragTravelPx = 0
  let wasDragged = false

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType !== 'mouse' || event.button !== 0) return

    dragPointerId = event.pointerId
    dragLastX = event.clientX
    dragTravelPx = 0
    wasDragged = false
  }

  function handlePointerMove(event: PointerEvent) {
    const element = scrollerRef.value
    if (event.pointerId !== dragPointerId || !element) return

    const deltaX = event.clientX - dragLastX
    dragLastX = event.clientX
    dragTravelPx += Math.abs(deltaX)
    if (!wasDragged && dragTravelPx < DRAG_THRESHOLD_PX) return

    if (!wasDragged) element.setPointerCapture?.(event.pointerId)
    wasDragged = true
    element.scrollLeft -= deltaX
  }

  function handlePointerEnd(event: PointerEvent) {
    if (event.pointerId === dragPointerId) dragPointerId = null
  }

  /* True when the click that just arrived ended a mouse drag, so the chart
   * can ignore it instead of treating it as a tap. Clears the flag. */
  function consumeDragClick(): boolean {
    const wasDrag = wasDragged
    wasDragged = false

    return wasDrag
  }

  return {
    scrollerRef,
    viewOffsetMs,
    isScrollable,
    scrollSpacerWidthPx,
    scrollThumb,
    handleTimeScaleChange,
    handleScroll,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
    consumeDragClick,
  }
}

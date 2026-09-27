import { useEventListener } from '@vueuse/core'

type Options = {
  /* The lane root: taps anywhere inside it bubble here. */
  target: Ref<HTMLElement | null>
  /* The lane's native scroller, present only while the lane can scroll. */
  scroller: Ref<HTMLElement | null>
  /* The pointer went down and up without dragging or being taken over by a
   * native pan (which fires pointercancel). */
  onTap: (event: PointerEvent) => void
}

/* px — how far a pointer may move before a press becomes a drag, so a slightly
 * wobbly tap on a block still plays its note. */
const DRAG_THRESHOLD_PX = 6

/*
 * Pointer handling for the Sing the Keys lane. Scrolling itself is native —
 * the lane's scroller gives touch momentum, wheel, trackpad and keys for
 * free — so this only adds what a native scroller lacks:
 * - taps, so a block under the scroller still sounds its note;
 * - mouse drag-to-scroll on desktop, moving the scroller's scrollTop so the
 *   content follows the cursor (drag down = ahead, as with touch).
 */
export function useLaneScroll(options: Options) {
  const { target, scroller, onTap } = options

  let pointerId: number | null = null
  let lastY = 0
  let travelPx = 0
  let isDragging = false

  function resetPointer() {
    pointerId = null
    travelPx = 0
    isDragging = false
  }

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (event.button !== 0) return

    pointerId = event.pointerId
    lastY = event.clientY
    travelPx = 0
    isDragging = false
  })

  useEventListener(target, 'pointermove', (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return

    const deltaY = event.clientY - lastY
    lastY = event.clientY
    travelPx += Math.abs(deltaY)
    if (!isDragging && travelPx < DRAG_THRESHOLD_PX) return

    isDragging = true
    /* Touch and pen pans are the browser's own (it cancels this pointer);
     * only a mouse needs the drag done by hand. */
    const element = scroller.value
    if (event.pointerType !== 'mouse' || !element) return

    /* Keep the drag when the cursor leaves the lane. Optional call, as not
     * every environment (happy-dom) implements capture. */
    if (!element.hasPointerCapture?.(event.pointerId))
      element.setPointerCapture?.(event.pointerId)
    element.scrollTop -= deltaY
  })

  useEventListener(target, 'pointerup', (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return

    const wasDragging = isDragging
    resetPointer()
    if (!wasDragging) onTap(event)
  })

  useEventListener(target, 'pointercancel', resetPointer)
}

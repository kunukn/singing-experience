import { useEventListener } from '@vueuse/core'
import { LOOKAHEAD_MS } from './singTheKeysTimeline'

type Options = {
  target: Ref<HTMLElement | null>
  isEnabled: () => boolean
  /* Lane scale: how many px one ms of song takes up. */
  pxPerMs: () => number
  /* Moves the lane by a ms delta (positive = ahead in the song) and reports
   * whether it moved — false at either end of the song. */
  scrollBy: (deltaMs: number) => boolean
  /* Moves the lane to an absolute ms position (Home / End). */
  scrollTo: (ms: number) => void
  /* The pointer went down and up without dragging (tracked whether or not
   * scrolling is enabled). */
  onTap: (event: PointerEvent) => void
}

/* px — how far a pointer may move before a press becomes a drag, so a slightly
 * wobbly tap on a block still plays its note. */
const DRAG_THRESHOLD_PX = 6

/* px per wheel "line" (deltaMode 1, e.g. Firefox with a mouse wheel) — about
 * one line of text, what browsers scroll a page by per notch. */
const WHEEL_LINE_PX = 16

/* ms — arrow-key step: a short nudge, about one beat at the default speed. */
const ARROW_STEP_MS = 500

/* Page keys move by most of the visible lane, keeping a little of the old
 * view on screen as an anchor. */
const PAGE_STEP_RATIO = 0.8

/*
 * Wheel, drag and keyboard scrolling for the Sing the Keys lane while it is
 * not playing. Everything is in the lane's direction of play: wheel down,
 * drag down and ArrowDown all move ahead in the song, the blocks falling as
 * they do during a run. Only vertical movement is taken — horizontal wheel
 * and touch panning are left to the piano's own scroll box.
 */
export function useLaneScroll(options: Options) {
  const { target, isEnabled, pxPerMs, scrollBy, scrollTo, onTap } = options

  /* deltaMode 0 = px, 1 = lines, 2 = pages. */
  function wheelDeltaMs(event: WheelEvent) {
    if (event.deltaMode === 1) return (event.deltaY * WHEEL_LINE_PX) / pxPerMs()

    if (event.deltaMode === 2) return event.deltaY * LOOKAHEAD_MS

    return event.deltaY / pxPerMs()
  }

  useEventListener(
    target,
    'wheel',
    (event: WheelEvent) => {
      if (!isEnabled()) return
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return

      /* Only claim the wheel while the lane can move: at either end the page
       * scrolls on as usual. */
      if (scrollBy(wheelDeltaMs(event))) event.preventDefault()
    },
    { passive: false },
  )

  /* Taps are tracked even while scrolling is off (mid-glide, say), so a
   * pressable block still plays; only the drag needs isEnabled. */
  let pointerId: number | null = null
  let pressedElement: Element | null = null
  let lastY = 0
  let travelPx = 0
  let isDragging = false

  function resetPointer() {
    pointerId = null
    pressedElement = null
    travelPx = 0
    isDragging = false
  }

  useEventListener(target, 'pointerdown', (event: PointerEvent) => {
    if (event.button !== 0) return

    pointerId = event.pointerId
    pressedElement = event.target as Element | null
    lastY = event.clientY
    travelPx = 0
    isDragging = false
  })

  useEventListener(target, 'pointermove', (event: PointerEvent) => {
    if (event.pointerId !== pointerId || !isEnabled()) return

    const deltaY = event.clientY - lastY
    lastY = event.clientY
    travelPx += Math.abs(deltaY)
    if (!isDragging && travelPx < DRAG_THRESHOLD_PX) return

    if (!isDragging) {
      isDragging = true
      /* Keep the drag when the pointer leaves the lane. Captured on the
       * pressed element: the lane box itself is pointer-events-none. Optional
       * call, as not every environment (happy-dom) implements capture. */
      pressedElement?.setPointerCapture?.(event.pointerId)
    }
    /* The blocks follow the pointer: dragging down pulls later notes down
     * into view, moving ahead in the song. */
    scrollBy(deltaY / pxPerMs())
  })

  useEventListener(target, 'pointerup', (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return

    const wasDragging = isDragging
    resetPointer()
    if (!wasDragging) onTap(event)
  })

  useEventListener(target, 'pointercancel', resetPointer)

  /* The lane always shows LOOKAHEAD_MS, so a page is that span. End scrolls
   * to infinity and lets the caller's clamp land it on the song's end. */
  const keyActions: Record<string, () => void> = {
    ArrowDown: () => scrollBy(ARROW_STEP_MS),
    ArrowUp: () => scrollBy(-ARROW_STEP_MS),
    PageDown: () => scrollBy(LOOKAHEAD_MS * PAGE_STEP_RATIO),
    PageUp: () => scrollBy(-LOOKAHEAD_MS * PAGE_STEP_RATIO),
    Home: () => scrollTo(0),
    End: () => scrollTo(Number.POSITIVE_INFINITY),
  }

  useEventListener(target, 'keydown', (event: KeyboardEvent) => {
    const action = keyActions[event.key]
    if (!isEnabled() || !action) return

    event.preventDefault()
    action()
  })
}

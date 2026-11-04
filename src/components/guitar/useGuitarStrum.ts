import { useEventListener } from '@vueuse/core'
import { guitarFretAtY, stringsCrossedBetween } from './guitarLayout'

type GuitarStrumOptions = {
  /* The board, whose left edge is string 6's column and top edge is fret 0. */
  target: Readonly<Ref<HTMLElement | null>>
  stringWidth: MaybeRefOrGetter<number>
  rowHeight: MaybeRefOrGetter<number>
  /* A pointermove is not a user gesture, so it cannot start suspended audio.
   * Sound is held back until this is true, or each pluck would wait on the resume
   * and they could all sound together when it finally lands. */
  isAudioRunning: () => boolean
  unlockAudio: () => void
  onPluck: (stringIndex: number, fret: number) => void
  /* A pluck while audio is locked: the visuals alone, so a swipe before the first
   * tap does not look like the board ignored it. */
  onSilentPluck: (stringIndex: number, fret: number) => void
}

type StrumPointer = {
  boardLeft: number
  startX: number
  lastX: number
  /* Held for the whole swipe, like a barre: rows are as short as 30px, so a thumb
   * arc drifts a row or two, and following it would sound a smeared chord. */
  fret: number
  isStrumming: boolean
}

/* px — sideways travel before a press becomes a strum. A string runs through the
 * middle of every cell, right where people tap, so a slightly wobbly tap would
 * otherwise cross it. Same allowance as useLaneScroll's tap. */
const STRUM_THRESHOLD_PX = 6

/* ms — the shortest gap between two plucks of one string, so a finger resting on
 * a line cannot machine-gun it. Well under a fast back-and-forth strum's ~125ms. */
const STRING_RETRIGGER_COOLDOWN_MS = 80

/*
 * Swipe across the strings to play them, for touch and pen. A mouse already sounds
 * on pointerdown, and its drag is not something anyone expects to strum with.
 *
 * Custom because no native gesture detects a line being crossed, but it owns only
 * the sideways axis: the board's `touch-action: pan-y pinch-zoom` leaves vertical
 * pans to the browser, which takes them by firing pointercancel, so the neck keeps
 * its native scrolling and momentum.
 *
 * Coordinates rather than per-cell events: a touch is implicitly captured by the
 * button it started on, so no other cell hears it pass.
 */
export function useGuitarStrum(options: GuitarStrumOptions) {
  const pointers = new Map<number, StrumPointer>()
  const lastPluckTimes = new Map<number, number>()
  let hasStrummed = false

  function pluckCrossedStrings(pointer: StrumPointer, toX: number) {
    const crossed = stringsCrossedBetween(
      pointer.lastX,
      toX,
      toValue(options.stringWidth),
    )

    for (const stringIndex of crossed) {
      const now = performance.now()
      const lastPluckTime = lastPluckTimes.get(stringIndex)

      if (
        lastPluckTime !== undefined &&
        now - lastPluckTime < STRING_RETRIGGER_COOLDOWN_MS
      ) {
        continue
      }

      lastPluckTimes.set(stringIndex, now)

      /* Not counted as a strum: a click that follows should still play, since a
       * tap is what can unlock the audio. */
      if (!options.isAudioRunning()) {
        options.onSilentPluck(stringIndex, pointer.fret)
        continue
      }

      hasStrummed = true
      options.onPluck(stringIndex, pointer.fret)
    }
  }

  useEventListener(options.target, 'pointerdown', (event: PointerEvent) => {
    if (event.pointerType === 'mouse') return

    const board = options.target.value
    if (!board) return

    hasStrummed = false
    options.unlockAudio()

    const rect = board.getBoundingClientRect()
    const startX = event.clientX - rect.left

    pointers.set(event.pointerId, {
      boardLeft: rect.left,
      startX,
      lastX: startX,
      fret: guitarFretAtY(event.clientY - rect.top, toValue(options.rowHeight)),
      isStrumming: false,
    })
  })

  useEventListener(options.target, 'pointermove', (event: PointerEvent) => {
    const pointer = pointers.get(event.pointerId)
    if (!pointer) return

    const x = event.clientX - pointer.boardLeft

    if (!pointer.isStrumming) {
      if (Math.abs(x - pointer.startX) < STRUM_THRESHOLD_PX) return

      pointer.isStrumming = true
    }

    /* lastX has stayed at startX until now, so a string crossed inside the
     * threshold still sounds. */
    pluckCrossedStrings(pointer, x)
    pointer.lastX = x
  })

  useEventListener(options.target, 'pointerup', (event: PointerEvent) => {
    if (!pointers.delete(event.pointerId)) return

    /* Worth trying, but no guarantee: an iPhone does not accept the lift of a
     * swipe, so there audio stays locked until a tap. See the page-wide unlock in
     * GuitarDisplay. */
    options.unlockAudio()
  })

  useEventListener(options.target, 'pointercancel', (event: PointerEvent) => {
    pointers.delete(event.pointerId)
  })

  /* True once if the gesture that just ended sounded a string. A short swipe can
   * still end in a click on its cell, which would play that note a second time. */
  function consumeStrumClick(): boolean {
    const shouldIgnoreClick = hasStrummed
    hasStrummed = false

    return shouldIgnoreClick
  }

  return { consumeStrumClick }
}

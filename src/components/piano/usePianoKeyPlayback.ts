import { useEventListener } from '@vueuse/core'
import { TONE_PLAY_DURATION_S } from '@/constants/toneConstants'
import { midiToFrequency } from '@/utils/noteUtils'

type PianoKeyPlaybackOptions = {
  /* Called right after a tone starts, so the caller can arm the preview deaf
   * period (stops the piano's own tone registering as sung pitch) or log the
   * note that played. */
  onTonePlayed?: (midi: number) => void
  /* Key down and key up with the event's timeStamp, for callers that record
   * how long a key is held (Song Recorder). The tone itself stays a fixed
   * length either way. */
  onNotePressed?: (midi: number, timeStamp: number) => void
  onNoteReleased?: (midi: number, timeStamp: number) => void
}

/*
 * Press-to-sound behaviour for a piano keyboard: plays the tone and counts key
 * presses so the view can (re)start the highlight fade. Rendering-only concerns
 * (geometry, labels, the fade itself) stay in the component.
 */
export function usePianoKeyPlayback(options: PianoKeyPlaybackOptions = {}) {
  /* playToneAt is polyphonic — it reuses the current mode's PolySynth and does
   * not cut the previous note, so several keys ring together (a chord). Bass
   * mode is a MonoSynth, so it stays monophonic there. */
  const { playToneAt, warmUp, getImmediate } = useTonePlayer()

  /* Press count per key — one entry per key ever pressed, so multiple keys can
   * be lit at once (multi-touch chords). The view keys its fade element on this
   * number, so a re-press remounts it and the fade restarts at full colour. */
  const pressCounts = reactive(new Map<number, number>())

  function pressCountFor(midi: number): number {
    return pressCounts.get(midi) ?? 0
  }

  async function playKey(midi: number) {
    pressCounts.set(midi, pressCountFor(midi) + 1)

    /* warmUp resolves the AudioContext within the press gesture (cached after
     * the first press); playToneAt needs it running and doesn't self-start. */
    await warmUp()
    /* getImmediate, not getNow: a press should sound at once, and getNow would
     * add Tone's 100 ms look-ahead on top of the device's output latency. */
    playToneAt(midiToFrequency(midi), TONE_PLAY_DURATION_S, getImmediate())
    options.onTonePlayed?.(midi)
  }

  /* Which key each pointer (finger, mouse, pen) went down on, so its release
   * can be reported even when it lifts somewhere else. */
  const midiByPointerId = new Map<number, number>()
  /* Key buttons held down with Enter/Space. */
  const heldByKeyboard = new Set<number>()

  function pressKey(midi: number, timeStamp: number) {
    options.onNotePressed?.(midi, timeStamp)
    void playKey(midi)
  }

  function handlePointerDown(event: PointerEvent, midi: number) {
    midiByPointerId.set(event.pointerId, midi)
    pressKey(midi, event.timeStamp)
  }

  /* On window: a mouse has no implicit pointer capture, so it can be released
   * off the key. pointercancel is the browser taking the touch for a pan. */
  function handlePointerEnd(event: PointerEvent) {
    const midi = midiByPointerId.get(event.pointerId)
    if (midi === undefined) return

    midiByPointerId.delete(event.pointerId)
    options.onNoteReleased?.(midi, event.timeStamp)
  }

  useEventListener(window, 'pointerup', handlePointerEnd)
  useEventListener(window, 'pointercancel', handlePointerEnd)

  /* Keyboard access: a <button> fires no pointerdown for Enter/Space, so play on
   * those keys too (ignoring auto-repeat while held). */
  function handleKeyDown(event: KeyboardEvent, midi: number) {
    if (event.repeat) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    heldByKeyboard.add(midi)
    pressKey(midi, event.timeStamp)
  }

  function handleKeyUp(event: KeyboardEvent, midi: number) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    if (!heldByKeyboard.delete(midi)) return

    options.onNoteReleased?.(midi, event.timeStamp)
  }

  /* Lifts every held key — the window lost focus or the keyboard unmounted, so
   * no up event will come and a recorded note would otherwise hang. */
  function releaseAll(timeStamp = performance.now()) {
    const held = new Set([...midiByPointerId.values(), ...heldByKeyboard])
    midiByPointerId.clear()
    heldByKeyboard.clear()
    held.forEach((midi) => options.onNoteReleased?.(midi, timeStamp))
  }

  useEventListener(window, 'blur', (event) => releaseAll(event.timeStamp))
  onBeforeUnmount(() => releaseAll())

  return {
    pressCountFor,
    playKey,
    handlePointerDown,
    handleKeyDown,
    handleKeyUp,
  }
}

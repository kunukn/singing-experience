import {
  TONE_CLICK_HIGHLIGHT_DURATION_MS,
  TONE_PLAY_DURATION_S,
} from '@/constants/toneConstants'
import { midiToFrequency } from '@/utils/noteUtils'

type PianoKeyPlaybackOptions = {
  /* Called right after a tone starts, so the caller can arm the preview deaf
   * period (stops the piano's own tone registering as sung pitch). */
  onTonePlayed?: () => void
}

/*
 * Press-to-sound behaviour for a piano keyboard: plays the tone and tracks
 * which keys are currently lit. Rendering-only concerns (geometry, labels) stay
 * in the component.
 */
export function usePianoKeyPlayback(options: PianoKeyPlaybackOptions = {}) {
  /* playToneAt is polyphonic — it reuses the current mode's PolySynth and does
   * not cut the previous note, so several keys ring together (a chord). Bass
   * mode is a MonoSynth, so it stays monophonic there. */
  const { playToneAt, warmUp, getNow } = useTonePlayer()

  /* Multiple keys can be lit at once (multi-touch chords). */
  const activeMidis = reactive(new Set<number>())
  const highlightTimers = new Map<number, ReturnType<typeof setTimeout>>()

  async function playKey(midi: number) {
    activeMidis.add(midi)
    const existing = highlightTimers.get(midi)
    if (existing) clearTimeout(existing)

    highlightTimers.set(
      midi,
      window.setTimeout(() => {
        activeMidis.delete(midi)
        highlightTimers.delete(midi)
      }, TONE_CLICK_HIGHLIGHT_DURATION_MS),
    )

    /* warmUp resolves the AudioContext within the press gesture (cached after
     * the first press); playToneAt needs it running and doesn't self-start. */
    await warmUp()
    playToneAt(midiToFrequency(midi), TONE_PLAY_DURATION_S, getNow())
    options.onTonePlayed?.()
  }

  /* Keyboard access: a <button> fires no pointerdown for Enter/Space, so play on
   * those keys too (ignoring auto-repeat while held). */
  function handleKeyDown(event: KeyboardEvent, midi: number) {
    if (event.repeat) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    void playKey(midi)
  }

  onUnmounted(() => {
    for (const timer of highlightTimers.values()) clearTimeout(timer)
    highlightTimers.clear()
  })

  return { activeMidis, playKey, handleKeyDown }
}

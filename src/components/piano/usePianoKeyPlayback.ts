import { TONE_PLAY_DURATION_S } from '@/constants/toneConstants'
import { midiToFrequency } from '@/utils/noteUtils'

type PianoKeyPlaybackOptions = {
  /* Called right after a tone starts, so the caller can arm the preview deaf
   * period (stops the piano's own tone registering as sung pitch). */
  onTonePlayed?: () => void
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
  const { playToneAt, warmUp, getNow } = useTonePlayer()

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

  return { pressCountFor, playKey, handleKeyDown }
}

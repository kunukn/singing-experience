import { TONE_PLAY_DURATION_S } from '@/constants/toneConstants'
import { midiToFrequency } from '@/utils/noteUtils'

type GuitarFretPlaybackOptions = {
  /* Called right after a tone starts, so the caller can arm the preview deaf
   * period (stops the guitar's own tone registering as sung pitch). */
  onTonePlayed?: () => void
}

function cellKey(stringIndex: number, fret: number): string {
  return `${stringIndex}:${fret}`
}

/*
 * Press-to-sound behaviour for a fretboard. The piano's equivalent counts
 * presses per MIDI note, which will not do here: one pitch sits at up to six
 * places on the board, so a MIDI-keyed count would light every one of them on a
 * single tap. Counting per board position keeps the glow on the cell that was
 * actually pressed.
 */
export function useGuitarFretPlayback(options: GuitarFretPlaybackOptions = {}) {
  /* playToneAt is polyphonic — it reuses the current mode's PolySynth and does
   * not cut the previous note, so several frets ring together (a chord). Bass
   * mode is a MonoSynth, so it stays monophonic there. */
  const { playToneAt, warmUp, getNow } = useTonePlayer()

  /* One entry per cell ever pressed, so several can be lit at once (multi-touch
   * chords). The view keys its fade element on this number, so a re-press
   * remounts it and the fade restarts at full colour. */
  const pressCounts = reactive(new Map<string, number>())

  function pressCountFor(stringIndex: number, fret: number): number {
    return pressCounts.get(cellKey(stringIndex, fret)) ?? 0
  }

  async function playFret(stringIndex: number, fret: number, midi: number) {
    pressCounts.set(
      cellKey(stringIndex, fret),
      pressCountFor(stringIndex, fret) + 1,
    )

    /* warmUp resolves the AudioContext within the press gesture (cached after
     * the first press); playToneAt needs it running and doesn't self-start. */
    await warmUp()
    playToneAt(midiToFrequency(midi), TONE_PLAY_DURATION_S, getNow())
    options.onTonePlayed?.()
  }

  /* Keyboard access: a <button> fires no pointerdown for Enter/Space, so play on
   * those keys too (ignoring auto-repeat while held). */
  function handleKeyDown(
    event: KeyboardEvent,
    stringIndex: number,
    fret: number,
    midi: number,
  ) {
    if (event.repeat) return
    if (event.key !== 'Enter' && event.key !== ' ') return

    event.preventDefault()
    void playFret(stringIndex, fret, midi)
  }

  return { pressCountFor, playFret, handleKeyDown }
}

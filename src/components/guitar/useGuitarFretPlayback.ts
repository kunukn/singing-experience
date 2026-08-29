import { midiToNoteLabel } from '@/utils/noteUtils'

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
  /* The sampled acoustic guitar the tuner uses, not the synth engine — this is a
   * guitar, so it should sound like one. Tone.Sampler is polyphonic and does not
   * cut the previous note, so several frets ring together as a chord. */
  const { play: playGuitarSample } = useGuitarSampler()

  /* One entry per cell ever pressed, so several can be lit at once (multi-touch
   * chords). The view keys its fade element on this number, so a re-press
   * remounts it and the fade restarts at full colour. */
  const pressCounts = reactive(new Map<string, number>())

  /*
   * The same count collapsed onto the string, which is what actually vibrates:
   * a string rings whichever fret stopped it, so the cell-keyed map above cannot
   * drive it — fretting the 5th and then the 7th on one string are two presses
   * of two different cells but the same string, and the animation has to restart
   * for the second.
   */
  const stringPressCounts = reactive(new Map<number, number>())

  function pressCountFor(stringIndex: number, fret: number): number {
    return pressCounts.get(cellKey(stringIndex, fret)) ?? 0
  }

  function stringPressCountFor(stringIndex: number): number {
    return stringPressCounts.get(stringIndex) ?? 0
  }

  async function playFret(stringIndex: number, fret: number, midi: number) {
    pressCounts.set(
      cellKey(stringIndex, fret),
      pressCountFor(stringIndex, fret) + 1,
    )
    stringPressCounts.set(stringIndex, stringPressCountFor(stringIndex) + 1)

    /*
     * The sampler is keyed by note name, so `.note` — the raw name, 'C#'. Not
     * `.label`, which is glyph-ified ('C♯') and would match no sample key.
     *
     * play() starts the AudioContext itself within the press gesture and
     * restores sampler volume after any prior stop() from the tuner, so no
     * separate warm-up is needed. Its default ring is used rather than the
     * synth's shorter duration: a plucked string should ring out.
     *
     * Every cell resolves to a sample: Tone picks the nearest key in the bank
     * and shifts from it, so no fret can miss. How far it shifts is the only
     * question, and that is the sample bank's problem — see EXTRA_SAMPLE_URLS.
     */
    const { note, octave } = midiToNoteLabel(midi)
    await playGuitarSample(note, octave)
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

  return { pressCountFor, stringPressCountFor, playFret, handleKeyDown }
}

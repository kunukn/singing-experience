import { useEventListener } from '@vueuse/core'
import { midiToNoteLabel } from '@/utils/noteUtils'
import {
  availableOctaveShifts,
  keyboardCodeForMidi,
  midiForKeyboardCode,
  qwertyCharForCode,
  PIANO_KEYBOARD_BASE_MIDI,
  SEMITONES_PER_OCTAVE,
} from './pianoKeyboardMap'

type PianoKeyboardInputOptions = {
  midiMin: MaybeRefOrGetter<number>
  midiMax: MaybeRefOrGetter<number>
  /* Called with the pitch to sound when a mapped key goes down. */
  onPlay: (midi: number) => void
}

/*
 * Elements that consume letter and digit keys themselves — typing in a search
 * box, or in a PrimeSelect (which jumps to the option starting with that
 * letter), must not also play a note.
 */
const TYPING_TARGET_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable=""]',
  '[contenteditable="true"]',
  '[role="combobox"]',
  '[role="listbox"]',
  '[role="searchbox"]',
  '[role="textbox"]',
].join(', ')

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element && target.closest(TYPING_TARGET_SELECTOR) !== null
  )
}

/*
 * Chromium exposes the user's physical layout, so we can print the glyph that is
 * really on the key — on AZERTY the key at QWERTY's Z position is printed "W".
 * Absent in Firefox and Safari, which fall back to the QWERTY glyph.
 */
type KeyboardLayoutCapableNavigator = Navigator & {
  keyboard?: { getLayoutMap?: () => Promise<Map<string, string>> }
}

/* Moves the whole map an octave at a time. The note map spends the letter rows
 * and 0/2/3/5/6/7/9, leaving `-` and `+` free and unambiguous. */
const OCTAVE_SHIFT_DIRECTION_BY_CODE: Record<string, -1 | 1> = {
  Minus: -1,
  NumpadSubtract: -1,
  Equal: 1,
  NumpadAdd: 1,
}

/*
 * Plays piano notes from the computer keyboard using the absolute two-row map in
 * pianoKeyboardMap, and reports which character to print on each key.
 *
 * The listener is on the window rather than the key <button>s: only one button
 * can hold focus, and they already spend Enter/Space on their own activation.
 */
export function usePianoKeyboardInput(options: PianoKeyboardInputOptions) {
  const layoutCharByCode = shallowRef<Map<string, string> | null>(null)

  /* Whole octaves the map is currently moved by; 0 is the printed C3/C4 layout. */
  const octaveShift = shallowRef(0)
  const shiftSemitones = computed(
    () => octaveShift.value * SEMITONES_PER_OCTAVE,
  )

  const octaveShiftOptions = computed(() =>
    availableOctaveShifts(toValue(options.midiMin), toValue(options.midiMax)),
  )

  /* Back to the printed layout on every range change: the map is absolute, so a
   * new range must not inherit a transpose the singer set for the old one. */
  watch(octaveShiftOptions, (available) => {
    octaveShift.value = available.includes(0) ? 0 : (available[0] ?? 0)
  })

  function stepOctaveShift(direction: -1 | 1): void {
    const available = octaveShiftOptions.value
    const next = available[available.indexOf(octaveShift.value) + direction]
    if (next === undefined) return

    octaveShift.value = next
  }

  onMounted(async () => {
    const { keyboard } = navigator as KeyboardLayoutCapableNavigator
    if (!keyboard?.getLayoutMap) return

    try {
      layoutCharByCode.value = await keyboard.getLayoutMap()
    } catch (error) {
      debugLog('[Piano] keyboard layout map unavailable', error)
    }
  })

  /* The character to print on the key that plays this pitch, or null when no
   * key maps to it. */
  function keyboardCharForMidi(midi: number): string | null {
    const code = keyboardCodeForMidi(midi - shiftSemitones.value)
    if (!code) return null

    /* Dead keys and modifiers can report multi-character values; only a single
     * glyph fits on a key face. */
    const layoutChar = layoutCharByCode.value?.get(code)
    const char = layoutChar?.length === 1 ? layoutChar : qwertyCharForCode(code)

    return char.toUpperCase()
  }

  /* Readout for the on-screen control: the leftmost mapped key and the note it
   * currently plays. Spelled in the user's own layout, so an AZERTY keyboard
   * reads "W = C3" — and it carries no translatable words. */
  const anchor = computed(() => {
    const midi = PIANO_KEYBOARD_BASE_MIDI + shiftSemitones.value

    return {
      char: keyboardCharForMidi(midi) ?? '',
      noteLabel: midiToNoteLabel(midi, { showOctave: true }).label,
    }
  })

  const octaveShiftIndex = computed(() =>
    octaveShiftOptions.value.indexOf(octaveShift.value),
  )
  const canShiftDown = computed(() => octaveShiftIndex.value > 0)
  const canShiftUp = computed(
    () =>
      octaveShiftIndex.value >= 0 &&
      octaveShiftIndex.value < octaveShiftOptions.value.length - 1,
  )

  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    /* A held key must not machine-gun the synth. */
    if (event.repeat) return
    /* Leave browser and OS shortcuts (⌘R, Ctrl+F, …) alone. */
    if (event.metaKey || event.ctrlKey || event.altKey) return
    if (isTypingTarget(event.target)) return

    const shiftDirection = OCTAVE_SHIFT_DIRECTION_BY_CODE[event.code]
    if (shiftDirection) {
      event.preventDefault()
      stepOctaveShift(shiftDirection)

      return
    }

    const mappedMidi = midiForKeyboardCode(event.code)
    if (mappedMidi === null) return

    const midi = mappedMidi + shiftSemitones.value
    /* Out-of-range pitches stay inert. Within a shift the map is absolute, so a
     * key keeps its pitch instead of being squeezed to fit the selected range. */
    if (midi < toValue(options.midiMin) || midi > toValue(options.midiMax))
      return

    event.preventDefault()
    options.onPlay(midi)
  })

  return {
    keyboardCharForMidi,
    octaveShift: readonly(octaveShift),
    octaveShiftOptions,
    stepOctaveShift,
    canShiftDown,
    canShiftUp,
    anchor,
  }
}

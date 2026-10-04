import { useLocalStorage } from '@vueuse/core'

/*
 * The computer-key chips printed on piano keys (Z, X, Q, 2…). On by default:
 * which letter plays which key is the first thing a typist needs. One key
 * across every program that draws the piano, so turning hints off once carries
 * over — the same deal "See your voice" and the voice-type ribbon get. Display
 * only: usePianoKeyboardInput keeps its bindings either way.
 */
const areKeyboardHintsVisible = useLocalStorage('syng.keyboardHints', true)

export function useKeyboardHints() {
  return { areKeyboardHintsVisible }
}

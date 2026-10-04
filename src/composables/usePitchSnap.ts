import { useLocalStorage } from '@vueuse/core'

/*
 * Pitch snap — the sung pitch is drawn on its nearest note, cents hidden, so a
 * child reads "on the note" rather than a wobbling line. Off by default: it is
 * the easier mode, not the standard view. One key across every game, so turning
 * it on once carries over — the same deal "See your voice" gets.
 */
const isPitchSnapEnabled = useLocalStorage('syng.pitchSnap', false)

export function usePitchSnap() {
  return { isPitchSnapEnabled }
}

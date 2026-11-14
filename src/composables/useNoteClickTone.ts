import { midiToFrequency } from '@/utils/noteUtils'
import type { Ref } from 'vue'
import { useTonePlayer } from './useTonePlayer'

/**
 * Click-to-hear for sheet notes: returns a handler that plays the given MIDI
 * note, unless `isBlocked` is true — a running timeline must not be sounded
 * over.
 */
export function useNoteClickTone(isBlocked: Readonly<Ref<boolean>>) {
  const { playTone } = useTonePlayer()

  return function playNote(midi: number) {
    if (isBlocked.value) return

    void playTone(midiToFrequency(midi))
  }
}

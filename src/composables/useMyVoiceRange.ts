import { useLocalStorage } from '@vueuse/core'
import {
  DEFAULT_MY_VOICE_RANGE,
  normalizeVoiceRange,
  type MidiRange,
} from '@/utils/normalizeVoiceRange'

/*
 * One app-wide copy, created at module load rather than per component: the
 * "My range" entry in VOICE_RANGES reads it from plain getters, outside any
 * component, and every page must see the same value the finder just saved.
 */
const storedRange = useLocalStorage<MidiRange>(
  'syng.myVoiceRange',
  { ...DEFAULT_MY_VOICE_RANGE },
  { mergeDefaults: true },
)

/* Defensive on read as well as write — the key can be edited from devtools or
 * another tab, and every program trusts the span it gets. */
const myVoiceRange = computed<MidiRange>(() =>
  normalizeVoiceRange(
    Number(storedRange.value?.midiMin),
    Number(storedRange.value?.midiMax),
  ),
)

/**
 * The singer's own range, found by the Voice Range Finder or picked by hand.
 * Always whole semitones inside C2–C7 and at least an octave wide (see
 * normalizeVoiceRange), so every range-driven program can use it as-is.
 */
export function useMyVoiceRange() {
  function setMyVoiceRange(midiMin: number, midiMax: number) {
    storedRange.value = normalizeVoiceRange(midiMin, midiMax)
  }

  function resetMyVoiceRange() {
    storedRange.value = { ...DEFAULT_MY_VOICE_RANGE }
  }

  return { myVoiceRange, setMyVoiceRange, resetMyVoiceRange }
}

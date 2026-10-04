<script setup lang="ts">
import { midiToFrequency, START_TONE_OPTIONS } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import SingTheKeysDisplay from './SingTheKeysDisplay.vue'
import {
  DEFAULT_SONG_ID,
  DEFAULT_RANGE_OFFSET,
  DEFAULT_SPEED,
  isSongId,
  isSpeedOption,
  SONGS,
  tonicMidiForRange,
  type SongId,
  type SpeedOption,
} from './singTheKeysSongs'
import { songMidiRange } from './singTheKeysTimeline'

/* Every persisted setting is checked on load and reset to its default when the
 * stored value is no longer an option (a song removed, a speed renamed). */
const songId = useLocalStorage<SongId>(
  'syng.singTheKeysSongId',
  DEFAULT_SONG_ID,
)
if (!isSongId(songId.value)) songId.value = DEFAULT_SONG_ID

/* Its own key, not Do-Re-Mi's syng.startOffset: a song sits by the middle of
 * its range, not on its tonic. The key name predates the range picker; the
 * value space (start-tone offsets) is unchanged, so saved picks still load. */
const rangeOffset = useLocalStorage(
  'syng.singTheKeysStartOffset',
  DEFAULT_RANGE_OFFSET,
)
if (
  !Number.isInteger(rangeOffset.value) ||
  !START_TONE_OPTIONS.some((option) => option.offset === rangeOffset.value)
) {
  rangeOffset.value = DEFAULT_RANGE_OFFSET
}

const speed = useLocalStorage<SpeedOption>(
  'syng.singTheKeysSpeed',
  DEFAULT_SPEED,
)
if (!isSpeedOption(speed.value)) speed.value = DEFAULT_SPEED

const isBeatLinesEnabled = useLocalStorage('syng.singTheKeysBeatLines', true)
const isMetronomeEnabled = useLocalStorage('syng.singTheKeysMetronome', false)
const { isPitchSnapEnabled } = usePitchSnap()
const isHitEffectsEnabled = useLocalStorage('syng.singTheKeysHitEffects', true)
const { areKeyboardHintsVisible } = useKeyboardHints()

const range = computed(() =>
  songMidiRange(
    SONGS[songId.value],
    tonicMidiForRange(SONGS[songId.value], rangeOffset.value),
  ),
)

/* Same detector tuning as Grace Kelly "Sing live": no onset debounce (fast
 * melodies re-articulate many short notes), a lower clarity bar so softer
 * notes still register, and a band around the keyboard span so a stray octave
 * or harmonic bypasses the smoothing instead of dragging the line.
 *
 * The mic only opens for a scored run, and a scored run plays no melody — that
 * is the ♪ preview's, with the mic closed. So the fully raw stream (echo
 * cancellation off) is safe, and it detects sustained tones best.
 *
 * The one sound a scored run can make is the metronome: a 15 ms tick at
 * 4186 Hz. The low-pass at the detector's own 1500 Hz ceiling takes it out of
 * the mic before detection and leaves the voice alone. A deep metronome could
 * not be filtered this way — what a speaker reproduces of it lies in the
 * singing range. The display masks any residue too — see useMetronomeMask. */
const detection = usePitchDetection({
  onsetDebounceMs: 0,
  clarityThreshold: 0.6,
  rawAudio: true,
  lowPassHz: 1500,
  bandMinFrequency: () => midiToFrequency(range.value.midiMin),
  bandMaxFrequency: () => midiToFrequency(range.value.midiMax),
})
</script>

<template>
  <SingTheKeysDisplay
    :detection="detection"
    v-model:songId="songId"
    v-model:rangeOffset="rangeOffset"
    v-model:speed="speed"
    v-model:isBeatLinesEnabled="isBeatLinesEnabled"
    v-model:isMetronomeEnabled="isMetronomeEnabled"
    v-model:isPitchSnapEnabled="isPitchSnapEnabled"
    v-model:isHitEffectsEnabled="isHitEffectsEnabled"
    v-model:areKeyboardHintsVisible="areKeyboardHintsVisible"
  />
</template>

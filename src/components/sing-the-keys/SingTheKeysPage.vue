<script setup lang="ts">
import { C3_MIDI, midiToFrequency, START_TONE_OPTIONS } from '@/utils/noteUtils'
import { useLocalStorage } from '@vueuse/core'
import SingTheKeysDisplay from './SingTheKeysDisplay.vue'
import {
  DEFAULT_SONG_ID,
  DEFAULT_SPEED,
  DEFAULT_START_OFFSET,
  isSongId,
  isSpeedOption,
  SONGS,
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

/* Its own key, not Do-Re-Mi's syng.startOffset: the tonic that suits a scale
 * run is not necessarily the one that suits a song. */
const startOffset = useLocalStorage(
  'syng.singTheKeysStartOffset',
  DEFAULT_START_OFFSET,
)
if (
  !Number.isInteger(startOffset.value) ||
  !START_TONE_OPTIONS.some((option) => option.offset === startOffset.value)
) {
  startOffset.value = DEFAULT_START_OFFSET
}

const speed = useLocalStorage<SpeedOption>(
  'syng.singTheKeysSpeed',
  DEFAULT_SPEED,
)
if (!isSpeedOption(speed.value)) speed.value = DEFAULT_SPEED

const isMelodyGuideEnabled = useLocalStorage(
  'syng.singTheKeysMelodyGuide',
  true,
)

const isBeatLinesEnabled = useLocalStorage('syng.singTheKeysBeatLines', true)
const areBeatLightsEnabled = useLocalStorage('syng.singTheKeysBeatLights', true)

const range = computed(() =>
  songMidiRange(SONGS[songId.value], C3_MIDI + startOffset.value),
)

/* Same detector tuning as Grace Kelly "Sing live": no onset debounce (fast
 * melodies re-articulate many short notes), a lower clarity bar so softer
 * notes still register, and a band around the keyboard span so a stray octave
 * or harmonic bypasses the smoothing instead of dragging the line.
 *
 * The mic profile follows the guide toggle. With the guide off nothing plays
 * while listening, so the fully raw stream (echo cancellation off) is safe and
 * detects sustained tones best. With the guide on, the speaker plays the exact
 * target pitch inside the exact scoring window, so echo cancellation has to
 * stay on or the guide scores itself — the self-test in
 * docs/research/grace-kelly-sing-detection-debug-2026-06-09.md hit 91% that
 * way. softRawAudio keeps EC on while still dropping noise suppression and AGC.
 * Read on each start(), so flipping the toggle takes effect on the next run. */
const detection = usePitchDetection({
  onsetDebounceMs: 0,
  clarityThreshold: 0.6,
  rawAudio: () => !isMelodyGuideEnabled.value,
  softRawAudio: true,
  bandMinFrequency: () => midiToFrequency(range.value.midiMin),
  bandMaxFrequency: () => midiToFrequency(range.value.midiMax),
})
</script>

<template>
  <SingTheKeysDisplay
    :detection="detection"
    v-model:songId="songId"
    v-model:startOffset="startOffset"
    v-model:speed="speed"
    v-model:isMelodyGuideEnabled="isMelodyGuideEnabled"
    v-model:isBeatLinesEnabled="isBeatLinesEnabled"
    v-model:areBeatLightsEnabled="areBeatLightsEnabled"
  />
</template>

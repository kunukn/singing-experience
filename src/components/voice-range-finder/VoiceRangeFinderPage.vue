<script setup lang="ts">
import { VOICE_RANGE_HIGHEST_MIDI } from '@/utils/normalizeVoiceRange'
import { midiToFrequency } from '@/utils/noteUtils'
import VoiceRangeFinderDisplay from './VoiceRangeFinderDisplay.vue'

/* Semitones the mic hears past the top of My range. A note just above the
 * limit is then still a note, so the finder can say it doesn't count rather
 * than calling it unclear. */
const SEMITONES_HEARD_ABOVE_LIMIT = 2

/* Spike rejection keeps a crack at the top of the voice from being held as a
 * new highest note. */
const detection = usePitchDetection({
  softRawAudio: true,
  rejectSpikes: true,
  maxFrequency: midiToFrequency(
    VOICE_RANGE_HIGHEST_MIDI + SEMITONES_HEARD_ABOVE_LIMIT,
  ),
})
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4">
    <VoiceRangeFinderDisplay :detection="detection" />
  </div>
</template>

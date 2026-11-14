<script setup lang="ts">
import { SEMITONES_PER_OCTAVE } from '@/components/piano/pianoKeyboardMap'

/* How wide a range is: the distance between its two notes, so G2–D4 is 19
 * semitones and an octave is 12 (not the 20 and 13 notes they hold). */
type Props = {
  midiMin: number
  midiMax: number
  /* Semitones and octaves on a line each, for a column too narrow to hold
   * them side by side. */
  isStacked?: boolean
}

const props = withDefaults(defineProps<Props>(), { isStacked: false })

const { t, locale } = useI18n()

const octaveFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }),
)

const semitones = computed(() => props.midiMax - props.midiMin)

const semitonesText = computed(() =>
  t(
    'voiceRangeFinder.widthSemitones',
    { count: semitones.value },
    semitones.value,
  ),
)

const octavesText = computed(() => {
  /* Rounded as shown, so 1.0 picks the singular along with its "1" */
  const octaves = Math.round((semitones.value / SEMITONES_PER_OCTAVE) * 10) / 10

  return t(
    'voiceRangeFinder.widthOctaves',
    { count: octaveFormat.value.format(octaves) },
    octaves,
  )
})
</script>

<template>
  <p
    class="text-sm text-(--p-text-muted-color) tabular-nums"
    data-testid="voice-range-width"
  >
    <template v-if="props.isStacked">
      <span class="block" data-testid="voice-range-width-semitones">
        {{ semitonesText }}
      </span>
      <span class="block" data-testid="voice-range-width-octaves">
        {{ octavesText }}
      </span>
    </template>
    <template v-else>{{ semitonesText }} · {{ octavesText }}</template>
  </p>
</template>

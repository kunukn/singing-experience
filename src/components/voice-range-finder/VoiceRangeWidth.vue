<script setup lang="ts">
import { SEMITONES_PER_OCTAVE } from '@/components/piano/pianoKeyboardMap'

/* How wide a range is: the distance between its two notes, so G2–D4 is 19
 * semitones and an octave is 12 (not the 20 and 13 notes they hold). */
type Props = {
  midiMin: number
  midiMax: number
}

const props = defineProps<Props>()

const { t, locale } = useI18n()

const octaveFormat = computed(
  () => new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }),
)

const widthText = computed(() => {
  const semitones = props.midiMax - props.midiMin
  /* Rounded as shown, so 1.0 picks the singular along with its "1" */
  const octaves = Math.round((semitones / SEMITONES_PER_OCTAVE) * 10) / 10

  const semitonesText = t(
    'voiceRangeFinder.widthSemitones',
    { count: semitones },
    semitones,
  )
  const octavesText = t(
    'voiceRangeFinder.widthOctaves',
    { count: octaveFormat.value.format(octaves) },
    octaves,
  )

  return `${semitonesText} · ${octavesText}`
})
</script>

<template>
  <p
    class="text-sm text-(--p-text-muted-color) tabular-nums"
    data-testid="voice-range-width"
  >
    {{ widthText }}
  </p>
</template>

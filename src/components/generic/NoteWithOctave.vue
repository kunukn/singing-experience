<script setup lang="ts">
import { toAccidentalGlyph } from '@/utils/noteUtils'

type Props = {
  /* Spelled name, ASCII or glyph ('C#', 'D♭'): callers that honour the
   * flat-spelling setting already hold the glyph, and re-glyphing is a no-op. */
  note: string
  octave: number
}

defineProps<Props>()
</script>

<!-- Letter first, octave quieter: most players know strings as E A D G B E.
     No whitespace between the spans, so the text still reads "E2". One wrapper,
     so a flex parent with a gap (PrimeButton) doesn't split letter and number. -->
<template>
  <span
    ><span class="note-letter font-semibold">{{ toAccidentalGlyph(note) }}</span
    ><span class="note-octave">{{ octave }}</span></span
  >
</template>

<style scoped>
/* Contrast comes from growing the letter, not shrinking the number: at 0.75em
 * a 14px button gave a 10.5px number, too small to read. Both sizes are
 * relative to the parent, so the number stays at 0.9em (12.6px on a peg). */
.note-letter {
  font-size: 1.25em;
}

/* Baseline, not raised: on a small pill a raised number reads like a power (E²).
 * Opacity rather than a fixed colour, so it follows the button's state colours. */
.note-octave {
  margin-inline-start: 2px; /* Keeps the bold letter from touching the number */
  font-size: 0.9em;
  font-weight: 400;
  opacity: 0.7;
}
</style>

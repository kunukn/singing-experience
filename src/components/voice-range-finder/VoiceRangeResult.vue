<script setup lang="ts">
import type { MidiRange } from '@/utils/normalizeVoiceRange'
import { formatRange } from './voiceRangeNotes'

type Props = {
  /* What the singer sang, low to high */
  sungRange: MidiRange
  /* What "Use this" saves: the sung range, stretched to an octave if needed */
  foundRange: MidiRange
}

const props = defineProps<Props>()

const emit = defineEmits<{
  tryAgain: []
  use: []
}>()

const { t } = useI18n()

const isWidened = computed(
  () =>
    props.sungRange.midiMin !== props.foundRange.midiMin ||
    props.sungRange.midiMax !== props.foundRange.midiMax,
)
</script>

<template>
  <section
    class="flex w-full flex-col items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
    data-testid="voice-range-finder-result"
  >
    <p class="text-center">
      {{
        t('voiceRangeFinder.resultTitle', {
          range: formatRange(sungRange.midiMin, sungRange.midiMax),
        })
      }}
    </p>
    <!-- A message, not muted text: the saved range differs from what was just
         sung, and a missed hint reads as a save that didn't work -->
    <PrimeMessage
      v-if="isWidened"
      severity="info"
      size="small"
      data-testid="voice-range-finder-widened"
    >
      {{
        t('voiceRangeFinder.widened', {
          range: formatRange(foundRange.midiMin, foundRange.midiMax),
        })
      }}
    </PrimeMessage>
    <div class="flex items-center gap-2">
      <PrimeButton
        severity="secondary"
        size="small"
        rounded
        data-testid="voice-range-finder-try-again"
        @click="emit('tryAgain')"
      >
        {{ t('voiceRangeFinder.tryAgain') }}
      </PrimeButton>
      <PrimeButton
        severity="success"
        size="small"
        rounded
        data-testid="voice-range-finder-use"
        @click="emit('use')"
      >
        {{ t('voiceRangeFinder.useThis') }}
      </PrimeButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import VoiceRangeWidth from '@/components/voice-range-finder/VoiceRangeWidth.vue'
import {
  formatNote,
  formatRange,
} from '@/components/voice-range-finder/voiceRangeNotes'

/* The tones the enabled parts reach from and to, and how wide that is. Sits
 * under the part toggles and shares their surface, so it reads as their footer. */
type Props = {
  midiMin: number
  midiMax: number
}

const props = defineProps<Props>()

/* A single part on one tone (the "One tone" part alone) has no width to show */
const isSingleTone = computed(() => props.midiMin === props.midiMax)

const tonesText = computed(() =>
  isSingleTone.value
    ? formatNote(props.midiMin)
    : formatRange(props.midiMin, props.midiMax),
)
</script>

<template>
  <div
    class="border-t border-(--p-content-border-color) bg-(--p-surface-50) px-3 py-2 text-start dark:bg-(--p-surface-900)"
    data-testid="grace-kelly-part-range"
  >
    <p
      class="text-sm text-(--p-text-color) tabular-nums"
      data-testid="grace-kelly-part-range-tones"
    >
      {{ tonesText }}
    </p>
    <VoiceRangeWidth
      v-if="!isSingleTone"
      isStacked
      :midiMin="props.midiMin"
      :midiMax="props.midiMax"
    />
  </div>
</template>

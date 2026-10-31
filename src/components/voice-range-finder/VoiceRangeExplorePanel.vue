<script setup lang="ts">
import { midiToNoteLabel } from '@/utils/noteUtils'
import { cleanTextColor } from '@/utils/pitchColors'
import { centsOffNearest } from './useRangeFinder'
import VoiceTypeComparison from './VoiceTypeComparison.vue'

type Props = {
  /* The note being sung right now, fractional so cents move; null when silent */
  liveMidi: number | null
}

const props = defineProps<Props>()

const { isDark } = useDarkMode()

const liveNote = computed(() =>
  props.liveMidi === null
    ? null
    : midiToNoteLabel(Math.round(props.liveMidi)).label,
)

const liveCents = computed(() =>
  props.liveMidi === null ? null : Math.round(centsOffNearest(props.liveMidi)),
)
const liveCentsText = computed(() => {
  if (liveCents.value === null) return ''

  return liveCents.value > 0 ? `+${liveCents.value}¢` : `${liveCents.value}¢`
})
const liveCentsColor = computed(() =>
  liveCents.value === null
    ? undefined
    : cleanTextColor(liveCents.value, isDark.value),
)
</script>

<template>
  <section
    class="flex w-full flex-col items-center gap-3 rounded-lg border border-(--p-content-border-color) bg-(--p-content-background) p-4"
    data-testid="voice-range-explore"
  >
    <!--
      The note gets a fixed centre column sized for the widest label (D♯3), so
      neither the meter nor the cents move as the note changes width.
    -->
    <div
      class="grid w-full grid-cols-[1fr_7rem_1fr] items-center gap-x-2"
      dir="ltr"
    >
      <CentsMeter class="justify-self-end text-3xl" :cents="liveCents" />
      <span
        class="text-center text-3xl font-semibold tabular-nums"
        data-testid="voice-range-explore-note"
      >
        {{ liveNote ?? '–' }}
      </span>
      <span
        class="justify-self-start text-sm font-medium tabular-nums"
        :style="{ color: liveCentsColor }"
        data-testid="voice-range-explore-cents"
      >
        {{ liveCentsText }}
      </span>
    </div>

    <VoiceTypeComparison :liveMidi="liveMidi" />
  </section>
</template>

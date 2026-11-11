<script setup lang="ts">
import type { MidiNoteLabel } from '@/utils/noteUtils'
import { directionalColor } from '@/utils/pitchColors'
import { MAX_CENTS_DEVIATION } from './useSingTone'

type Props = {
  targetNoteLabel: MidiNoteLabel
  isSingingCorrectNote: boolean
  showSingHigherArrow: boolean
  showSingLowerArrow: boolean
  centsFromTarget: number | null
  targetFrequency: number | null
  currentFrequency: number | null
  holdProgress: number
}

const props = defineProps<Props>()

const { t } = useI18n()

/* Green anywhere inside the allowed range, then the too low / too high
 * colours of the arrows beside it */
const centsColor = computed(() =>
  directionalColor(props.centsFromTarget ?? 0, MAX_CENTS_DEVIATION),
)
</script>

<template>
  <div class="pointer-events-none flex flex-col items-center gap-1">
    <div
      class="text-3xl font-bold"
      :class="
        isSingingCorrectNote ? 'text-(--pitch-clean)' : 'text-(--p-text-color)'
      "
    >
      {{ targetNoteLabel.label }}
    </div>

    <div class="flex items-center gap-2">
      <div class="grid w-6 place-items-center">
        <div
          class="col-start-1 row-start-1"
          :class="
            showSingLowerArrow
              ? 'animate-bounce text-(--pitch-low)'
              : 'invisible'
          "
        >
          <ArrowUpIcon class="size-5 rotate-180" />
        </div>
        <div
          class="col-start-1 row-start-1"
          :class="
            showSingHigherArrow
              ? 'animate-bounce text-(--pitch-high)'
              : 'invisible'
          "
        >
          <ArrowUpIcon class="size-5" />
        </div>
      </div>

      <CentsDeviationBar
        :cents="centsFromTarget"
        :threshold="MAX_CENTS_DEVIATION"
        :maxRange="150"
        :isVisible="true"
        :highLabel="t('generic.tooHigh')"
        :lowLabel="t('generic.tooLow')"
        colorMode="directional"
        class="pe-8"
      />
    </div>

    <div class="flex min-h-8 flex-col justify-end gap-1">
      <div class="flex items-center text-xs">
        <CentsLabel :cents="centsFromTarget" :color="centsColor" />
      </div>

      <p v-if="targetFrequency" class="text-xs text-(--p-surface-500)">
        {{
          t('doReMi.allowedRange', {
            cents: MAX_CENTS_DEVIATION,
            hz: Math.round(targetFrequency),
          })
        }}
      </p>
      <p
        class="text-xs tabular-nums"
        :class="
          currentFrequency === null
            ? 'invisible'
            : 'text-(--p-text-muted-color)'
        "
      >
        {{
          t('doReMi.currentHz', {
            hz: Math.round(currentFrequency ?? 0),
          })
        }}
      </p>
    </div>

    <!-- Hold progress bar -->
    <div
      class="mt-1 h-2 w-full max-w-full overflow-hidden rounded-full bg-(--p-surface-200) dark:bg-(--p-surface-700)"
    >
      <div
        class="h-full rounded-full bg-(--p-green-500) transition-all duration-100"
        :style="{ width: `${holdProgress * 100}%` }"
      />
    </div>
  </div>
</template>

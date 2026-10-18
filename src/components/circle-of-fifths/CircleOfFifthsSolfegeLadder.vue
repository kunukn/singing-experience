<script setup lang="ts">
import { MAJOR_SCALE_SEMITONES, SOLFEGE_LABELS } from '@/utils/noteUtils'
import { CIRCLE_KEYS, majorScaleSpelling } from './circleOfFifths'
import type { Solfege } from './useCircleOfFifthsGame'
import { TRIAD_OFFSETS } from './useCircleOfFifthsPlayback'

const { keyIndex, hopSolfege, activeSolfege } = defineProps<{
  keyIndex: number
  hopSolfege: 'SO' | 'FA'
  /* The syllable being sung right now, or null between walks */
  activeSolfege: Solfege | null
}>()

const { t } = useI18n()

const ariaLabel = computed(() =>
  t('circleOfFifths.keyMajor', { key: CIRCLE_KEYS[keyIndex].label }),
)

const steps = computed(() => {
  const noteLabels = majorScaleSpelling(keyIndex)

  return SOLFEGE_LABELS.map((solfege, index) => {
    /* Only the bottom DO — both hops climb from it; the top DO is the octave */
    const isHopNote = index === 0 || solfege === hopSolfege

    const semitones = MAJOR_SCALE_SEMITONES[index]

    return {
      solfege,
      note: noteLabels[index],
      isHighlighted: isHopNote,
      isActive: isHopNote && solfege === activeSolfege,
      /* DO MI SO — the chord each lit key plays. SO is in it; FA sits a half
       * step above MI, which is how the singer finds it going fourths */
      isChordTone: (TRIAD_OFFSETS as readonly number[]).includes(semitones),
      /* MI→FA and TI→DO, the scale's only half steps */
      isHalfStepUp:
        index > 0 && semitones - MAJOR_SCALE_SEMITONES[index - 1] === 1,
    }
  })
})
</script>

<template>
  <ol
    class="flex items-start pt-3"
    :aria-label="ariaLabel"
    data-testid="circle-solfege-ladder"
  >
    <li
      v-for="(step, index) in steps"
      :key="index"
      class="relative flex w-8 flex-col items-center gap-0.5"
      :class="{ 'ms-1.5': index > 0 && !step.isHalfStepUp }"
      data-testid="circle-solfege-step"
      :data-solfege="step.solfege"
      :data-highlighted="step.isHighlighted"
      :data-active="step.isActive"
      :data-chord-tone="step.isChordTone"
      :data-half-step-up="step.isHalfStepUp"
    >
      <!-- Half-step pairs sit flush; the ½ straddles the join. w-3 centred on
        the inline-start edge, so it lands on the join in RTL too -->
      <span
        v-if="step.isHalfStepUp"
        class="absolute -start-1.5 -top-3 w-3 text-center text-[10px] leading-3 text-(--p-text-muted-color)"
        aria-hidden="true"
        >½</span
      >
      <span
        class="w-full rounded-sm border text-center text-xs font-bold transition-[color,background-color,border-color,scale] duration-150"
        :class="
          step.isActive
            ? 'scale-110 border-(--p-primary-color) bg-(--p-primary-color) text-(--p-primary-contrast-color)'
            : step.isHighlighted
              ? 'border-(--p-primary-color) text-(--p-primary-color)'
              : 'border-(--p-surface-300) text-(--p-surface-500) dark:border-(--p-surface-700)'
        "
        >{{ step.solfege }}</span
      >
      <span
        class="text-xs"
        data-testid="circle-solfege-note"
        :class="
          step.isHighlighted
            ? 'font-semibold text-(--p-text-color)'
            : 'text-(--p-text-muted-color)'
        "
        >{{ step.note }}</span
      >
      <!-- Reserved on every step so the row stays level -->
      <span
        class="size-1 rounded-full"
        :class="step.isChordTone ? 'bg-(--p-text-muted-color)' : 'invisible'"
        aria-hidden="true"
      />
    </li>
  </ol>
</template>

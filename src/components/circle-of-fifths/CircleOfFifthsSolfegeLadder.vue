<script setup lang="ts">
import { SOLFEGE_LABELS } from '@/utils/noteUtils'
import { CIRCLE_KEYS, majorScaleSpelling } from './circleOfFifths'
import type { Solfege } from './useCircleOfFifthsGame'

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

    return {
      solfege,
      note: noteLabels[index],
      isHighlighted: isHopNote,
      isActive: isHopNote && solfege === activeSolfege,
    }
  })
})
</script>

<template>
  <ol
    class="flex items-start gap-1"
    :aria-label="ariaLabel"
    data-testid="circle-solfege-ladder"
  >
    <li
      v-for="(step, index) in steps"
      :key="index"
      class="flex w-8 flex-col items-center gap-0.5"
      data-testid="circle-solfege-step"
      :data-solfege="step.solfege"
      :data-highlighted="step.isHighlighted"
      :data-active="step.isActive"
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
    </li>
  </ol>
</template>

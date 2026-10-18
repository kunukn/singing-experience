<script setup lang="ts">
import { MAJOR_SCALE_SEMITONES, SOLFEGE_LABELS } from '@/utils/noteUtils'
import { CIRCLE_KEYS, majorScaleSpelling } from './circleOfFifths'
import type { Solfege } from './useCircleOfFifthsGame'
import { TRIAD_OFFSETS } from './useCircleOfFifthsPlayback'

/* major: the DO MI SO family and the walk's hops. minor: LA, the relative
 * minor's home — purple like the Find LA button and the minor wedges */
export type LadderTone = 'major' | 'minor'
export type LadderHighlight = { solfege: Solfege; tone: LadderTone }

const { keyIndex, startSolfege, highlights, activeSolfege } = defineProps<{
  keyIndex: number
  /* DO → DO for the walk, whose hops climb from DO; LA → LA for Explore,
   * where Find LA drops below DO */
  startSolfege: 'DO' | 'LA'
  highlights: readonly LadderHighlight[]
  /* The syllable being sung right now, or null between rounds */
  activeSolfege: Solfege | null
}>()

const { t } = useI18n()

const STEP_COUNT = 8
const DEGREES_PER_OCTAVE = 7
const SEMITONES_PER_OCTAVE = 12
/* Scale degrees from DO: LA sits two below it */
const FIRST_DEGREE = { DO: 0, LA: -2 } as const

const CHIP_CLASS: Record<LadderTone, { highlighted: string; active: string }> =
  {
    major: {
      highlighted: 'border-(--p-primary-color) text-(--p-primary-color)',
      active:
        'scale-110 border-(--p-primary-color) bg-(--p-primary-color) text-(--p-primary-contrast-color)',
    },
    minor: {
      highlighted: 'border-(--p-purple-500) text-(--p-purple-500)',
      active:
        'scale-110 border-(--p-purple-500) bg-(--p-purple-500) text-(--p-surface-0)',
    },
  }
const MUTED_CHIP_CLASS =
  'border-(--p-surface-300) text-(--p-surface-500) dark:border-(--p-surface-700)'

const ariaLabel = computed(() =>
  t('circleOfFifths.keyMajor', { key: CIRCLE_KEYS[keyIndex].label }),
)

const steps = computed(() => {
  const noteLabels = majorScaleSpelling(keyIndex)
  const rows = Array.from({ length: STEP_COUNT }, (_, index) => {
    const degree = FIRST_DEGREE[startSolfege] + index
    const octave = Math.floor(degree / DEGREES_PER_OCTAVE)
    /* Wraps below DO: degree -2 is LA of the octave underneath */
    const scaleIndex = degree - octave * DEGREES_PER_OCTAVE

    return {
      solfege: SOLFEGE_LABELS[scaleIndex],
      note: noteLabels[scaleIndex],
      semitones:
        octave * SEMITONES_PER_OCTAVE + MAJOR_SCALE_SEMITONES[scaleIndex],
    }
  })

  /* Patterns and hops stay within an octave of DO, never reaching the upper
   * duplicate — so a syllable lands on the lowest chip with its name: the
   * walk's bottom DO, Find LA's low LA */
  const lowestIndexOf = (solfege: Solfege) =>
    rows.findIndex((row) => row.solfege === solfege)
  const toneByIndex = new Map(
    highlights.map((highlight) => [
      lowestIndexOf(highlight.solfege),
      highlight.tone,
    ]),
  )
  const activeIndex = activeSolfege === null ? -1 : lowestIndexOf(activeSolfege)

  return rows.map((row, index) => {
    const tone = toneByIndex.get(index) ?? null
    const isActive = tone !== null && index === activeIndex

    return {
      solfege: row.solfege,
      note: row.note,
      tone,
      isHighlighted: tone !== null,
      isActive,
      chipClass:
        tone === null
          ? MUTED_CHIP_CLASS
          : CHIP_CLASS[tone][isActive ? 'active' : 'highlighted'],
      /* DO MI SO — the chord each key plays. SO is in it; FA sits a half
       * step above MI, which is how the singer finds it going fourths */
      isChordTone: (TRIAD_OFFSETS as readonly number[]).includes(row.semitones),
      /* MI→FA and TI→DO, the scale's only half steps */
      isHalfStepUp:
        index > 0 && row.semitones - rows[index - 1].semitones === 1,
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
      :data-tone="step.tone"
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
        :class="step.chipClass"
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

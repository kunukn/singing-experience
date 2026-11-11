<script setup lang="ts">
import { isNearZeroCents, NEAR_ZERO_CENTS_TEXT } from '@/utils/centsText'

const { cents, color } = defineProps<{
  /* null = no pitch; the label keeps its space so neighbours hold still */
  cents: number | null
  /* Overrides the preview colour, for a readout coloured by its own rule
   * (Do-Re-Mi's green inside the allowed range) */
  color?: string
}>()

const { locale } = useI18n()
const { colorForCents } = usePitchPreviewColor()

const centsFormat = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      signDisplay: 'exceptZero',
      maximumFractionDigits: 0,
    }),
)

/* No pitch shows the placeholder invisibly, so the label keeps a real width.
 * Inside the dead zone the text reads ≈0¢; the colour and data-cents stay
 * exact. */
const centsText = computed(() => {
  if (cents === null) return null

  if (isNearZeroCents(cents)) return NEAR_ZERO_CENTS_TEXT

  return `${centsFormat.value.format(cents)}¢`
})
</script>

<template>
  <span
    class="whitespace-nowrap tabular-nums"
    :class="{ invisible: centsText === null }"
    dir="ltr"
    :style="{
      color: cents === null ? undefined : (color ?? colorForCents(cents)),
    }"
    :data-cents="cents ?? 'none'"
    >{{ centsText ?? '+0¢' }}</span
  >
</template>

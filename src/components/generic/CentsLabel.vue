<script setup lang="ts">
const { cents } = defineProps<{
  /* null = no pitch; the label keeps its space so neighbours hold still */
  cents: number | null
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

/* No pitch shows the placeholder invisibly, so the label keeps a real width */
const centsText = computed(() =>
  cents === null ? null : `${centsFormat.value.format(cents)}¢`,
)
</script>

<template>
  <span
    class="whitespace-nowrap tabular-nums"
    :class="{ invisible: centsText === null }"
    dir="ltr"
    :style="{ color: cents === null ? undefined : colorForCents(cents) }"
    :data-cents="cents ?? 'none'"
    >{{ centsText ?? '+0¢' }}</span
  >
</template>

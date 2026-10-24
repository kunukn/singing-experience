<script setup lang="ts">
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { LARGE_SMALL_BUTTON_ICON_PT } from '@/constants/buttonStyles'

type Props = {
  iconOn: string
  iconOff: string
  label: string
  disabled?: boolean
  /* Stay a circle at every width. For a row that has already spent its space
   * on other labelled toggles — the label still reaches screen readers and the
   * tooltip through aria-label/title. */
  isLabelHidden?: boolean
}

const props = defineProps<Props>()

const modelValue = defineModel<boolean>({ required: true })

/* Show the text label from Tailwind's md (768px) up; below that PrimeVue renders the button
 * icon-only — a native circle (rounded + p-button-icon-only), no CSS overrides needed. */
const breakpoints = useBreakpoints(breakpointsTailwind)
const isWideViewport = breakpoints.greaterOrEqual('md')
const isLabelVisible = computed(
  () => isWideViewport.value && !props.isLabelHidden,
)
</script>

<template>
  <PrimeButton
    :class="[
      // PrimeVue leaves .p-button wrappable; a short label must overflow a tight track, not break onto two lines
      'whitespace-nowrap',
      /* Off keeps the secondary button's muted colour; on brightens to full
       * text colour. Not opacity: PrimeVue already fades a disabled button,
       * and the two stacked left a disabled-off icon near invisible. */
      { 'border border-(--p-green-500)! text-(--p-text-color)!': modelValue },
    ]"
    :pt="LARGE_SMALL_BUTTON_ICON_PT"
    severity="secondary"
    text
    rounded
    size="small"
    :icon="modelValue ? iconOn : iconOff"
    :label="isLabelVisible ? label : undefined"
    :aria-pressed="modelValue"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="modelValue = !modelValue"
  />
</template>

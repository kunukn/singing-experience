<script setup lang="ts">
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { BREAKPOINT_XS_PX } from '@/constants/breakpoints'
import { LARGE_SMALL_BUTTON_ICON_PT } from '@/constants/buttonStyles'
import type { ToggleLabelBreakpoint, ToggleLabelFrom } from './toggleIconButton'

type Props = {
  iconOn: string
  iconOff: string
  label: string
  disabled?: boolean
  /* When the text label shows beside the icon. How much room a row has
   * depends on the page, so each toggle picks: from a Tailwind breakpoint up,
   * 'always', or 'never' (a circle at every width, for a row that has already
   * spent its space). Without text the label still reaches screen readers and
   * the tooltip through aria-label/title. */
  labelFrom?: ToggleLabelFrom
}

const props = withDefaults(defineProps<Props>(), { labelFrom: 'md' })

const modelValue = defineModel<boolean>({ required: true })

/* Without a label PrimeVue renders the button icon-only — a native circle
 * (rounded + p-button-icon-only), no CSS overrides needed. The media queries
 * are made once here: creating them inside the computed would add listeners
 * on every re-run. */
const breakpoints = useBreakpoints({
  ...breakpointsTailwind,
  xs: BREAKPOINT_XS_PX,
})
const isAtLeast: Record<ToggleLabelBreakpoint, Ref<boolean>> = {
  xs: breakpoints.greaterOrEqual('xs'),
  sm: breakpoints.greaterOrEqual('sm'),
  md: breakpoints.greaterOrEqual('md'),
  lg: breakpoints.greaterOrEqual('lg'),
}
const isLabelVisible = computed(() => {
  if (props.labelFrom === 'always') return true
  if (props.labelFrom === 'never') return false

  return isAtLeast[props.labelFrom].value
})
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

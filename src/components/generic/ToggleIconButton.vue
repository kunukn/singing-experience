<script setup lang="ts">
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'

type Props = {
  iconOn: string
  iconOff: string
  label: string
  disabled?: boolean
}

defineProps<Props>()

const modelValue = defineModel<boolean>({ required: true })

/* Show the text label from Tailwind's md (768px) up; below that PrimeVue renders the button
 * icon-only — a native circle (rounded + p-button-icon-only), no CSS overrides needed. */
const breakpoints = useBreakpoints(breakpointsTailwind)
const isLabelVisible = breakpoints.greaterOrEqual('md')
</script>

<template>
  <PrimeButton
    :class="[
      'min-h-8.75 min-w-8.75', // pin icon-only circle to 35px so it aligns with the sibling selects/Start
      // PrimeVue leaves .p-button wrappable; a short label must overflow a tight track, not break onto two lines
      'whitespace-nowrap',
      modelValue ? 'border border-(--p-green-500)!' : 'opacity-50',
    ]"
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

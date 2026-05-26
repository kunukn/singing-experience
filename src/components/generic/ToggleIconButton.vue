<script setup lang="ts">
type Props = {
  iconOn: string
  iconOff: string
  label: string
  disabled?: boolean
}

defineProps<Props>()

const modelValue = defineModel<boolean>({ required: true })
</script>

<template>
  <PrimeButton
    :class="[
      'min-h-8.75', // match the labeled-state height so icon-only mode does not collapse
      modelValue ? 'border border-(--p-green-500)!' : 'opacity-50',
    ]"
    severity="secondary"
    text
    rounded
    size="small"
    :aria-pressed="modelValue"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    @click="modelValue = !modelValue"
  >
    <i :class="modelValue ? iconOn : iconOff" />
    <span class="ms-0 hidden md:inline">{{ label }}</span>
  </PrimeButton>
</template>

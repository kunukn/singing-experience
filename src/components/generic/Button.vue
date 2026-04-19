<script setup lang="ts">
type ButtonVariant = 'green' | 'red' | 'purple' | 'yellow'

type Props = {
  variant?: ButtonVariant
  disabled?: boolean
}

const { variant = 'green', disabled = false } = defineProps<Props>()

const variantClasses: Record<ButtonVariant, string> = {
  green: 'bg-green-600 hover:bg-green-700',
  red: 'bg-red-600 hover:bg-red-700',
  purple: 'bg-purple-600 hover:bg-purple-700',
  yellow: 'bg-yellow-600 hover:bg-yellow-700',
}
</script>

<template>
  <button
    type="button"
    class="rounded-full px-8 py-2 text-lg font-medium transition-colors"
    :class="[
      disabled ? 'cursor-not-allowed opacity-50' : variantClasses[variant],
    ]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

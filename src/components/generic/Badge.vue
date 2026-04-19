<script setup lang="ts">
type BadgeVariant = 'yellow' | 'green' | 'red' | 'blue'

type Props = {
  variant?: BadgeVariant
}

const { variant = 'yellow' } = defineProps<Props>()

const variantClasses: Record<BadgeVariant, string> = {
  yellow: 'bg-yellow-500/20 text-yellow-300',
  green: 'bg-green-500/20 text-green-300',
  red: 'bg-red-500/20 text-red-300',
  blue: 'bg-blue-500/20 text-blue-300',
}
</script>

<template>
  <span
    class="inline-block rounded-full px-2 py-0.5 align-middle text-xs leading-none font-semibold uppercase"
    :class="variantClasses[variant]"
  >
    <slot />
  </span>
</template>

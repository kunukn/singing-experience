<script setup lang="ts">
type Props = {
  modelValue: number
  description: string
  label: string
  minLabel: string
  maxLabel: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', Number(target.value))
}
</script>

<template>
  <div class="flex flex-col gap-1">
    <p class="text-xs leading-relaxed text-(--p-text-muted-color)">
      {{ description }}
    </p>
    <label class="flex flex-col gap-1 text-sm text-(--p-text-color)">
      {{ label }} ({{ modelValue }})
      <input
        :value="modelValue"
        type="range"
        min="0"
        max="10"
        step="1"
        class="accent-(--p-primary-color)"
        @input="onInput"
      />
      <span class="flex justify-between text-xs text-(--p-text-muted-color)">
        <span>{{ minLabel }}</span>
        <span>{{ maxLabel }}</span>
      </span>
    </label>
  </div>
</template>

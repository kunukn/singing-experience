<script setup lang="ts">
import type { ToneMode } from '@/composables/useTonePlayer'

defineProps<{
  modelValue: ToneMode
}>()

defineEmits<{
  'update:modelValue': [value: ToneMode]
}>()

const { t } = useI18n()
</script>

<template>
  <BasicSelect
    :modelValue="modelValue"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <option value="piano">🎹 {{ t('sounds.piano') }}</option>
    <option value="bell">🔔 {{ t('sounds.bell') }}</option>
    <option value="bass">🎸 {{ t('sounds.bass') }}</option>
    <option value="square">⬜ {{ t('sounds.square') }}</option>
  </BasicSelect>
</template>

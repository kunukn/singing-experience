<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'

defineProps<{
  modelValue: ToneMode
}>()

defineEmits<{
  'update:modelValue': [value: ToneMode]
}>()

const { t } = useI18n()

const options = computed(() => [
  { label: `🔔 ${t('sounds.bell')}`, value: 'bell' as ToneMode },
  { label: `〰️ ${t('sounds.tuning')}`, value: 'tuning' as ToneMode },
  { label: `〰️ ${t('sounds.tuning')} 2`, value: 'tuning2' as ToneMode },
  { label: `🎹 ${t('sounds.keyboard')}`, value: 'keyboard' as ToneMode },
  { label: `🎸 ${t('sounds.bass')}`, value: 'bass' as ToneMode },
  { label: `⬜ ${t('sounds.square')}`, value: 'square' as ToneMode },
])
</script>

<template>
  <PrimeSelect
    :modelValue="modelValue"
    :options="options"
    optionLabel="label"
    optionValue="value"
    size="small"
    scrollHeight="370px"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <template #header>
      <div class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)">
        {{ t('sounds.toneSound') }}
      </div>
    </template>
  </PrimeSelect>
</template>

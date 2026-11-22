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
  { label: t('sounds.bell'), value: 'bell' as ToneMode },
  { label: t('sounds.keyboard'), value: 'keyboard' as ToneMode },
  { label: t('sounds.organ'), value: 'organ' as ToneMode },
  { label: t('sounds.flute'), value: 'flute' as ToneMode },
  { label: t('sounds.tuning'), value: 'tuning' as ToneMode },
  { label: `${t('sounds.tuning')} 2`, value: 'tuning2' as ToneMode },
  { label: t('sounds.bass'), value: 'bass' as ToneMode },
  { label: t('sounds.square'), value: 'square' as ToneMode },
])

function labelOf(mode: ToneMode): string {
  return options.value.find((option) => option.value === mode)?.label ?? ''
}
</script>

<template>
  <PrimeSelect
    :modelValue="modelValue"
    :options="options"
    optionLabel="label"
    optionValue="value"
    size="small"
    scrollHeight="370px"
    :ariaLabel="t('sounds.toneSound')"
    @update:modelValue="$emit('update:modelValue', $event)"
  >
    <template #value="{ value, placeholder }">
      <span v-if="value" class="flex items-center gap-2">
        <ToneModeIcon :mode="value" class="size-5 shrink-0" />
        {{ labelOf(value) }}
      </span>
      <span v-else>{{ placeholder }}</span>
    </template>
    <template #header>
      <div class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)">
        {{ t('sounds.toneSound') }}
      </div>
    </template>
    <template #option="{ option }">
      <span class="flex items-center gap-2">
        <ToneModeIcon :mode="option.value" class="size-5 shrink-0" />
        {{ option.label }}
      </span>
    </template>
  </PrimeSelect>
</template>

<script setup lang="ts">
/* Omit `allowedIndices` to offer every range; pass a subset to narrow it. Groups
 * left empty by the subset are dropped by the composable. */
const {
  allowedIndices,
  noteLabelMode = 'span',
  headerLabel,
} = defineProps<{
  allowedIndices?: readonly number[]
  noteLabelMode?: 'span' | 'startNote'
  headerLabel?: string
}>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })

const { t } = useI18n()

const voiceRangeGroups = useVoiceRangeGroups(() => ({
  allowedIndices,
  noteLabelMode,
}))
</script>

<template>
  <PrimeSelect
    v-model="rangeIndex"
    :options="voiceRangeGroups"
    optionLabel="label"
    optionValue="value"
    optionGroupLabel="label"
    optionGroupChildren="items"
    size="small"
    scrollHeight="370px"
  >
    <template #header>
      <div class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)">
        {{ headerLabel ?? t('generic.voiceRange') }}
      </div>
    </template>
    <template #optiongroup="{ index, option }">
      <div
        class="select-voice-range-option-group flex items-center"
        :class="{ 'mt-4': index !== 0 }"
      >
        <div>{{ option.label }}</div>
      </div>
    </template>
  </PrimeSelect>
</template>

<style scoped>
.select-voice-range-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>

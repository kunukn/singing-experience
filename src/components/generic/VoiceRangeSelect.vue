<script setup lang="ts">
const { headerLabel } = defineProps<{
  headerLabel?: string
}>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })

const { t } = useI18n()

const voiceRangeGroups = useVoiceRangeGroups()
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
    <template #footer>
      <!-- A real link, so it navigates in the same tab and reads as navigation -->
      <RouterLink
        to="/voice-range-finder"
        class="block border-t border-(--p-content-border-color) px-3 py-2 text-sm text-(--p-primary-color) no-underline"
        data-testid="voice-range-select-find-my-range"
      >
        🎤 {{ t('generic.findMyRange') }}
      </RouterLink>
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

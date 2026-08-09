<script setup lang="ts">
import type { ScaleMode } from '@/utils/noteUtils'

/* Omit `modes` to offer the whole catalogue; pass a subset to narrow it. Groups
 * left empty by the subset are dropped by the builder. */
const { modes } = defineProps<{ modes?: readonly ScaleMode[] }>()

const scaleMode = defineModel<ScaleMode>('scaleMode', { required: true })

const scaleModeGroups = useScaleModeGroups(modes)
</script>

<template>
  <PrimeSelect
    v-model="scaleMode"
    :options="scaleModeGroups"
    optionLabel="label"
    optionValue="id"
    optionGroupLabel="label"
    optionGroupChildren="items"
    size="small"
    scrollHeight="370px"
  >
    <template #optiongroup="{ index, option }">
      <div
        class="select-scale-mode-option-group flex items-center"
        :class="{ 'mt-4': index !== 0 }"
      >
        <div>{{ option.label }}</div>
      </div>
    </template>
  </PrimeSelect>
</template>

<style scoped>
.select-scale-mode-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>

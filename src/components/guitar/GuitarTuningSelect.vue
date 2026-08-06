<script setup lang="ts">
import {
  buildGuitarTuningGroups,
  type GuitarTuningId,
} from '@/utils/guitarTunings'

const tuningId = defineModel<GuitarTuningId>('tuningId', { required: true })

const { t } = useI18n()

/* Same grouped list the tuner shows, from the same catalogue — the two pages must
 * never disagree about which tunings exist or what they are called. */
const tuningGroups = computed(() => buildGuitarTuningGroups(t))
</script>

<template>
  <PrimeSelect
    v-model="tuningId"
    :options="tuningGroups"
    optionLabel="label"
    optionValue="value"
    optionGroupLabel="label"
    optionGroupChildren="items"
    size="small"
    scrollHeight="370px"
    class="min-w-31.5"
    :ariaLabel="t('tuner.tuning')"
    data-testid="guitar-tuning"
  >
    <template #optiongroup="{ index, option }">
      <div
        class="select-tuning-option-group flex items-center"
        :class="{ 'mt-4': index !== 0 }"
      >
        <div>{{ option.label }}</div>
      </div>
    </template>
  </PrimeSelect>
</template>

<style scoped>
.select-tuning-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>

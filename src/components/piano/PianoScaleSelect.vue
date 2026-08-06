<script setup lang="ts">
import {
  SCALE_ROOT_OPTIONS,
  type ScaleHighlightMode,
} from '@/utils/scaleHighlight'

/* null = highlighting off, which is the default state of the keyboard. */
const scaleRoot = defineModel<number | null>('scaleRoot', { required: true })
const scaleMode = defineModel<ScaleHighlightMode>('scaleMode', {
  required: true,
})

const { t } = useI18n()

const modeOptions = useScaleModeOptions()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
      t('scale.highlightScale')
    }}</label>
    <PrimeSelect
      v-model="scaleRoot"
      :options="SCALE_ROOT_OPTIONS"
      optionLabel="label"
      optionValue="pitchClass"
      :placeholder="t('scale.pickKey')"
      showClear
      size="small"
      class="min-w-32"
      :ariaLabel="t('scale.highlightScale')"
      data-testid="piano-scale-root"
    >
      <template #header>
        <div class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)">
          {{ t('scale.pickKeyHeader') }}
        </div>
      </template>
    </PrimeSelect>

    <PrimeSelect
      v-model="scaleMode"
      :options="modeOptions"
      optionLabel="label"
      optionValue="id"
      :disabled="scaleRoot === null"
      size="small"
      class="min-w-40"
      :ariaLabel="t('scale.scaleMode')"
      data-testid="piano-scale-mode"
    />
  </div>
</template>

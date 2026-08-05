<script setup lang="ts">
import {
  PIANO_SCALE_MODES,
  PIANO_SCALE_ROOT_OPTIONS,
  type PianoScaleMode,
} from './pianoScale'

/* null = highlighting off, which is the default state of the keyboard. */
const scaleRoot = defineModel<number | null>('scaleRoot', { required: true })
const scaleMode = defineModel<PianoScaleMode>('scaleMode', { required: true })

const { t } = useI18n()

const modeOptions = computed(() =>
  PIANO_SCALE_MODES.map((id) => ({ id, label: t(`piano.scaleModes.${id}`) })),
)
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
      t('piano.highlightScale')
    }}</label>
    <PrimeSelect
      v-model="scaleRoot"
      :options="PIANO_SCALE_ROOT_OPTIONS"
      optionLabel="label"
      optionValue="pitchClass"
      :placeholder="t('piano.pickKey')"
      showClear
      size="small"
      class="min-w-32"
      :ariaLabel="t('piano.highlightScale')"
      data-testid="piano-scale-root"
    >
      <template #header>
        <div class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)">
          {{ t('piano.pickKeyHeader') }}
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
      :ariaLabel="t('piano.scaleMode')"
      data-testid="piano-scale-mode"
    />
  </div>
</template>

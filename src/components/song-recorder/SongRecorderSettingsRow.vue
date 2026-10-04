<script setup lang="ts">
import { ALLOWED_BPMS, GRID_OPTIONS, type Grid } from './songRecorderConstants'

type Props = {
  /* Tempo and click are baked into a take — locked from count-in onwards. */
  isTempoLocked: boolean
  /* Grid re-quantizes the kept take, but not under running playback. */
  isGridLocked: boolean
}

const props = defineProps<Props>()

const bpm = defineModel<number>('bpm', { required: true })
const grid = defineModel<Grid>('grid', { required: true })
const isClickEnabled = defineModel<boolean>('isClickEnabled', {
  required: true,
})

const { t } = useI18n()

const bpmOptions = [...ALLOWED_BPMS]
  .sort((a, b) => b - a)
  .map((value) => ({ label: `${value} BPM`, value }))

/* 1/16 above 1/8 — finer grid = more steps per bar (largest first). */
const gridOptions = GRID_OPTIONS.map((value) => ({
  label: `1/${value}`,
  value,
}))

const rowRef = ref<HTMLElement | null>(null)
const { canScrollStart, canScrollEnd } = useScrollEdgeMask(rowRef)
</script>

<template>
  <div
    ref="rowRef"
    class="settings-row"
    :class="{
      'mask-start': canScrollStart,
      'mask-end': canScrollEnd,
    }"
  >
    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.tempo')
      }}</label>
      <PrimeSelect
        v-model="bpm"
        :options="bpmOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isTempoLocked"
        data-testid="song-recorder-bpm"
      />
    </div>

    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('songRecorder.grid')
      }}</label>
      <PrimeSelect
        v-model="grid"
        :options="gridOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isGridLocked"
        data-testid="song-recorder-grid"
      />
    </div>

    <div class="settings-item">
      <div />
      <ToggleIconButton
        v-model="isClickEnabled"
        iconOn="pi pi-stopwatch"
        iconOff="pi pi-stopwatch"
        :label="t('generic.beat')"
        :disabled="props.isTempoLocked"
      />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* One row from md up: three items side by side. */
.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr];
}
</style>

<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import {
  GAME_DURATION_OPTIONS,
  HOLD_DURATION_OPTIONS,
} from './pitchGameOptions'

const { t } = useI18n()

type Props = {
  rangeLabel: string
}

defineProps<Props>()

const holdDurationSec = defineModel<number>('holdDurationSec', {
  required: true,
})
const gameDurationSec = defineModel<number>('gameDurationSec', {
  required: true,
})
const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const toneMode = defineModel<ToneMode>('toneMode', { required: true })

const holdDurationOptions = [...HOLD_DURATION_OPTIONS]
  .sort((a, b) => b - a)
  .map((sec) => ({
    label: `${sec}s`,
    value: sec,
  }))
const gameDurationOptions = [...GAME_DURATION_OPTIONS]
  .sort((a, b) => b - a)
  .map((sec) => ({
    label: `${sec}s`,
    value: sec,
  }))

const rowRef = ref<HTMLElement | null>(null)
const { canScrollStart, canScrollEnd } = useScrollEdgeMask(rowRef)
</script>

<template>
  <div
    ref="rowRef"
    class="settings-row"
    :class="{ 'mask-start': canScrollStart, 'mask-end': canScrollEnd }"
  >
    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.holdDuration')
      }}</label>
      <PrimeSelect
        v-model="holdDurationSec"
        :options="holdDurationOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.holdDuration') }}
          </div>
        </template></PrimeSelect
      >
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('generic.gameLength') }}</label
      >
      <PrimeSelect
        v-model="gameDurationSec"
        :options="gameDurationOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.gameLength') }}
          </div>
        </template></PrimeSelect
      >
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        rangeLabel
      }}</label>
      <VoiceRangeSelect
        v-model:rangeIndex="rangeIndex"
        :headerLabel="t('warmUp.voice')"
      />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block md:min-w-22.5"
        >{{ t('sounds.toneSound') }}</label
      >
      <ToneModeSelect v-model="toneMode" />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr];
}
</style>

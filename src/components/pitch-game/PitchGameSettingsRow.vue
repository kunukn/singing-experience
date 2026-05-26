<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import {
  GAME_DURATION_OPTIONS,
  HOLD_DURATION_OPTIONS,
} from './pitchGameOptions'

const { t } = useI18n()

type RangeOption = {
  label: string
  value: number
}

type Props = {
  rangeOptions: RangeOption[]
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
      <PrimeSelect
        v-model="rangeIndex"
        :options="rangeOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('warmUp.voice') }}
          </div>
        </template></PrimeSelect
      >
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
  @apply flex w-full snap-x snap-mandatory items-center justify-center-safe gap-4 overflow-x-auto px-6 pb-2;
  @apply sm:mb-4;
  @apply md:grid md:w-auto md:snap-none md:grid-cols-[auto_1fr_auto_1fr] md:overflow-visible md:px-0 md:pb-0;

  /* Match the container's px-6 so snap-start aligns the first/last item at scrollLeft 0/max,
   * keeping the conditional edge mask in sync with the true scroll boundaries. */
  scroll-padding-inline: 1.5rem;
}

/* Edge fade — signals horizontal scrollability on iOS where scrollbars auto-hide.
 * Applied only on the side(s) that can actually be scrolled toward. */
.settings-row.mask-start.mask-end {
  mask-image: linear-gradient(
    to right,
    transparent 0,
    black 1.5rem,
    black calc(100% - 1.5rem),
    transparent 100%
  );
}

.settings-row.mask-start:not(.mask-end) {
  mask-image: linear-gradient(to right, transparent 0, black 1.5rem);
}

.settings-row.mask-end:not(.mask-start) {
  mask-image: linear-gradient(
    to right,
    black calc(100% - 1.5rem),
    transparent 100%
  );
}

@media (min-width: 768px) {
  .settings-row.mask-start,
  .settings-row.mask-end,
  .settings-row.mask-start.mask-end {
    mask-image: none;
  }
}

.settings-item {
  @apply flex shrink-0 snap-start items-center gap-2;
  @apply md:col-span-2 md:grid md:shrink md:snap-align-none md:grid-cols-subgrid md:items-center;
}
</style>

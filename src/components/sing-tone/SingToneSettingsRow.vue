<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { VOICE_RANGES } from '@/constants/voiceRanges'

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const durationSec = defineModel<number>('durationSec', { required: true })
const totalRounds = defineModel<number>('totalRounds', { required: true })

const { t } = useI18n()

const holdDurationOptions = [0.1, 0.3, 0.5, 0.75, 1, 2, 3, 4, 5, 6, 7, 10]
const durationOptions = holdDurationOptions.map((sec) => ({
  label: `${sec}s`,
  value: sec,
}))
const ROUNDS_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)

const { setToneMode } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed<ToneMode>({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
  },
})
setToneMode(storedToneMode.value)

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
        t('generic.voiceRange')
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
            {{ t('generic.voiceRange') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.holdDuration')
      }}</label>
      <PrimeSelect
        v-model="durationSec"
        :options="durationOptions"
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
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('singTone.rounds')
      }}</label>
      <PrimeSelect v-model="totalRounds" :options="ROUNDS_OPTIONS" size="small">
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('singTone.rounds') }}
          </div>
        </template>
        <template #option="{ option }">
          <div class="flex items-center justify-between gap-3">
            {{ option }}
          </div>
        </template>
      </PrimeSelect>
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

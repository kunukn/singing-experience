<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import type { ScaleMode } from '@/utils/noteUtils'
import {
  DEFAULT_STARTING_SEMITONE_OFFSET,
  SCALE_MODE_GROUPS,
  START_TONE_GROUPS,
} from './useDoReMiGame'

const startOffset = defineModel<number>('startOffset', { required: true })
const scaleMode = defineModel<ScaleMode>('scaleMode', { required: true })
const durationSec = defineModel<number>('durationSec', { required: true })

const { t } = useI18n()

const holdDurationOptions = [
  0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
]
const durationOptions = holdDurationOptions.map((sec) => ({
  label: `${sec}s`,
  value: sec,
}))

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
        t('doReMi.startTone')
      }}</label>
      <PrimeSelect
        v-model="startOffset"
        :options="START_TONE_GROUPS"
        optionLabel="label"
        optionValue="offset"
        optionGroupLabel="voiceTier"
        optionGroupChildren="items"
        size="small"
        scrollHeight="370px"
      >
        <template #header>
          <div class="p-3 text-sm font-medium">
            {{ t('doReMi.pickToneHeader') }}
          </div>
        </template>
        <template #optiongroup="{ index, option }">
          <div
            :data-index="index + 1"
            class="select-start-tone-option-group flex items-center"
            :class="{ 'mt-4': index !== 0 }"
          >
            <div>{{ t(`doReMi.voiceTier.${option.voiceTier}`) }}</div>
          </div>
        </template>
        <template #option="{ option }">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center font-medium">
              <span class="block min-w-8">
                {{ option.label }}
              </span>
              <span
                v-if="option.offset === DEFAULT_STARTING_SEMITONE_OFFSET"
                class="ms-1"
                >⭐</span
              >
            </div>
          </div>
        </template>
        <template #footer>
          <div class="p-3 text-xs text-(--p-text-muted-color)">
            {{ t('doReMi.pickToneFooter') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('doReMi.scaleMode') }}</label
      >
      <PrimeSelect
        v-model="scaleMode"
        :options="SCALE_MODE_GROUPS"
        optionLabel="label"
        optionValue="id"
        optionGroupLabel="label"
        optionGroupChildren="items"
        scrollHeight="370px"
        size="small"
      >
        <template #optiongroup="{ index, option }">
          <div
            :data-index="index + 1"
            class="select-scale-mode-option-group flex items-center"
            :class="{ 'mt-4': index !== 0 }"
          >
            <div>{{ option.label }}</div>
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

.select-scale-mode-option-group,
.select-start-tone-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>

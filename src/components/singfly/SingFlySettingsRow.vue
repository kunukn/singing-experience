<script setup lang="ts">
import { VOICE_RANGES } from '@/constants/voiceRanges'
import {
  DIFFICULTY_OPTIONS,
  GAME_DURATION_OPTIONS,
  type Difficulty,
} from './singFlyOptions'

const { t } = useI18n()

const gameDurationSec = defineModel<number>('gameDurationSec', {
  required: true,
})
const difficulty = defineModel<Difficulty>('difficulty', { required: true })
const rangeIndex = defineModel<number>('rangeIndex', { required: true })

const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)

const gameDurationOptions = [...GAME_DURATION_OPTIONS]
  .sort((a, b) => b - a)
  .map((sec) => ({ label: `${sec}s`, value: sec }))

const difficultyOptions = DIFFICULTY_OPTIONS.map((level) => ({
  label: t(`generic.difficulty_${level}`),
  value: level,
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
        t('generic.difficulty')
      }}</label>
      <PrimeSelect
        v-model="difficulty"
        :options="difficultyOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.difficulty') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.gameLength')
      }}</label>
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
        </template>
      </PrimeSelect>
    </div>

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
  </div>
</template>

<style scoped>
@reference '@/style.css';

.settings-row {
  @apply flex w-full snap-x snap-mandatory items-center justify-center-safe gap-4 overflow-x-auto px-6 pb-2;
  @apply sm:mb-4;
  @apply md:grid md:w-auto md:snap-none md:grid-cols-[auto_1fr_auto_1fr_auto_1fr] md:overflow-visible md:px-0 md:pb-0;

  scroll-padding-inline: 1.5rem;
}

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

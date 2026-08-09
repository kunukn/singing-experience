<script setup lang="ts">
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
      <VoiceRangeSelect v-model:rangeIndex="rangeIndex" />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr];
}
</style>

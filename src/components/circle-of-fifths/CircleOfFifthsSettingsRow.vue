<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { DIFFICULTY_OPTIONS, type Difficulty } from '@/constants/difficulty'
import type { CircleDirection } from './circleOfFifths'
import { HOLD_DURATION_OPTIONS } from './useCircleOfFifthsGame'

const { showDirection = true } = defineProps<{
  showDirection?: boolean
}>()

const direction = defineModel<CircleDirection>('direction', { required: true })
const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const difficulty = defineModel<Difficulty>('difficulty', { required: true })
const holdDurationSec = defineModel<number>('holdDurationSec', {
  required: true,
})

const { t } = useI18n()

const directionOptions = computed(() => [
  { label: t('circleOfFifths.directionFifths'), value: 'clockwise' },
  { label: t('circleOfFifths.directionFourths'), value: 'counterClockwise' },
])

const difficultyOptions = DIFFICULTY_OPTIONS.map((level) => ({
  label: t(`generic.difficulty_${level}`),
  value: level,
}))

const holdDurationOptions = [...HOLD_DURATION_OPTIONS]
  .toReversed()
  .map((sec) => ({ label: `${sec}s`, value: sec }))

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
    <div v-if="showDirection" class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('circleOfFifths.direction')
      }}</label>
      <PrimeSelectButton
        v-model="direction"
        :options="directionOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :aria-label="t('circleOfFifths.direction')"
      >
        <template #option="{ option }">
          <span class="whitespace-nowrap">{{ option.label }}</span>
        </template>
      </PrimeSelectButton>
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('generic.voiceRange') }}</label
      >
      <VoiceRangeSelect v-model:rangeIndex="rangeIndex" />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('generic.difficulty') }}</label
      >
      <PrimeSelect
        v-model="difficulty"
        :options="difficultyOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('generic.holdDuration') }}</label
      >
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
  @apply md:grid-cols-[repeat(4,auto)] lg:grid-cols-[repeat(6,auto)] xl:grid-cols-[repeat(10,auto)];
}
</style>

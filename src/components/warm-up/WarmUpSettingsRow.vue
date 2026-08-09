<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import {
  HOLD_DURATION_OPTIONS,
  PATTERN_SHORT_LABELS,
  SEMITONE_STEP_OPTIONS,
  SEQUENCE_COUNT_OPTIONS,
  WARM_UP_PATTERNS,
  WARM_UP_VOICE_RANGE_INDICES,
  type WarmUpPatternId,
} from './useWarmUpGame'

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const durationSec = defineModel<number>('durationSec', { required: true })
const sequenceCount = defineModel<number>('sequenceCount', { required: true })
const semitoneStep = defineModel<number>('semitoneStep', { required: true })
const patternId = defineModel<WarmUpPatternId>('patternId', { required: true })

const { t } = useI18n()

const patternGroups = computed(() => [
  {
    label: t('warmUp.patternGroups.basic'),
    items: WARM_UP_PATTERNS.filter((p) => p.group === 'basic').map((p) => ({
      label: t(`warmUp.patterns.${p.id}`),
      value: p.id,
    })),
  },
  {
    label: t('warmUp.patternGroups.playful'),
    items: WARM_UP_PATTERNS.filter((p) => p.group === 'playful').map((p) => ({
      label: t(`warmUp.patterns.${p.id}`),
      value: p.id,
    })),
  },
  {
    label: t('warmUp.patternGroups.advanced'),
    items: WARM_UP_PATTERNS.filter((p) => p.group === 'advanced').map((p) => ({
      label: t(`warmUp.patterns.${p.id}`),
      value: p.id,
    })),
  },
])

const durationOptions = [...HOLD_DURATION_OPTIONS].toReversed().map((sec) => ({
  label: `${sec}s`,
  value: sec,
}))
const sequenceCountOptions = [...SEQUENCE_COUNT_OPTIONS]
  .toReversed()
  .map((n) => ({
    label: `${n}`,
    value: n,
  }))
const semitoneStepOptions = [...SEMITONE_STEP_OPTIONS]
  .toReversed()
  .map((n) => ({
    label: `${n}`,
    value: n,
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
        t('warmUp.pattern')
      }}</label>
      <PrimeSelect
        v-model="patternId"
        :options="patternGroups"
        optionGroupLabel="label"
        optionGroupChildren="items"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #value="{ value, placeholder }">
          <span v-if="value">{{
            PATTERN_SHORT_LABELS[value as WarmUpPatternId]
          }}</span>
          <span v-else>{{ placeholder }}</span>
        </template>
        <template #optiongroup="{ index, option }">
          <div
            class="select-warm-up-pattern-option-group flex items-center"
            :class="{ 'mt-4': index !== 0 }"
          >
            <div>{{ option.label }}</div>
          </div>
        </template>
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('warmUp.pattern') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('warmUp.voice')
      }}</label>
      <VoiceRangeSelect
        v-model:rangeIndex="rangeIndex"
        :allowedIndices="WARM_UP_VOICE_RANGE_INDICES"
        noteLabelMode="startNote"
        :headerLabel="t('warmUp.voice')"
      />
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
        t('warmUp.sequences')
      }}</label>
      <PrimeSelect
        v-model="sequenceCount"
        :options="sequenceCountOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('warmUp.sequences') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('warmUp.semitoneStep')
      }}</label>
      <PrimeSelect
        v-model="semitoneStep"
        :options="semitoneStepOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('warmUp.semitoneStep') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('sounds.toneSound')
      }}</label>
      <ToneModeSelect v-model="toneMode" />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* 3 (label, select) column-pairs → 6 items wrap into a 3 × 2 layout that
 * fits the parent's max-w-3xl shell and gives long translations room. */
.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr] md:gap-x-4 md:gap-y-3;
}

.select-warm-up-pattern-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>

<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'

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
      <VoiceRangeSelect v-model:rangeIndex="rangeIndex" />
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
  @apply md:grid-cols-[auto_1fr_auto_1fr];
}
</style>

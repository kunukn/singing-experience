<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import type { ScaleMode } from '@/utils/noteUtils'
import { DEFAULT_STARTING_SEMITONE_OFFSET } from './useDoReMiGame'

const startOffset = defineModel<number>('startOffset', { required: true })
const scaleMode = defineModel<ScaleMode>('scaleMode', { required: true })
const durationSec = defineModel<number>('durationSec', { required: true })

const { t } = useI18n()

/* Declared ascending for readability, shown largest first — see "Vertical
 * Ordering" in AGENTS.md. */
const holdDurationOptions = [
  0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
]
const durationOptions = holdDurationOptions.toReversed().map((sec) => ({
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
      <StartToneSelect
        v-model:startOffset="startOffset"
        :defaultOffset="DEFAULT_STARTING_SEMITONE_OFFSET"
      />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('doReMi.scaleMode') }}</label
      >
      <ScaleModeSelect
        v-model:scaleMode="scaleMode"
        :ariaLabel="t('doReMi.scaleMode')"
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

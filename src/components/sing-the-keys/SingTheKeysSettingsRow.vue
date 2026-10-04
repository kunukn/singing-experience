<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneMode } from '@/composables/toneEngine'
import SongRangeSelect from './SongRangeSelect.vue'
import SongSelect from './SongSelect.vue'
import {
  SPEED_OPTIONS,
  type Song,
  type SongId,
  type SpeedOption,
} from './singTheKeysSongs'

type Props = {
  /* True while a run is going — the selects stay locked so the timeline
   * can't be changed underneath it. */
  isRunning: boolean
  /* The selected song, so the range options show its own lowest–highest. */
  song: Song
  accidentalStyle: AccidentalStyle
}

const props = defineProps<Props>()

const songId = defineModel<SongId>('songId', { required: true })
const rangeOffset = defineModel<number>('rangeOffset', { required: true })
const speed = defineModel<SpeedOption>('speed', { required: true })

const { t } = useI18n()

/* SPEED_OPTIONS is already largest first ("Vertical Ordering" in AGENTS.md).
 * The × labels are numeric, so they stay untranslated. */
const speedOptions = SPEED_OPTIONS.map((value) => ({
  label: `${value}×`,
  value,
}))

const { setToneMode, warmUp } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed<ToneMode>({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    void warmUp().catch((error) =>
      debugLog('[SingTheKeys] warmUp on tone-mode change failed', error),
    )
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
        t('singTheKeys.song')
      }}</label>
      <SongSelect v-model:songId="songId" :disabled="props.isRunning" />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('singTheKeys.songRange') }}</label
      >
      <SongRangeSelect
        v-model:rangeOffset="rangeOffset"
        :song="props.song"
        :accidentalStyle="props.accidentalStyle"
        :disabled="props.isRunning"
      />
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('singTheKeys.speed')
      }}</label>
      <PrimeSelect
        v-model="speed"
        :options="speedOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isRunning"
        :ariaLabel="t('singTheKeys.speed')"
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
  @apply md:grid-cols-[repeat(4,auto)];
}
</style>

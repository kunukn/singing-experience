<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import {
  DEFAULT_START_OFFSET,
  SONG_IDS,
  SPEED_OPTIONS,
  type SongId,
  type SpeedOption,
} from './singTheKeysSongs'

type Props = {
  /* True while a run is going — the selects stay locked so the timeline
   * can't be changed underneath it. */
  isRunning: boolean
}

const props = defineProps<Props>()

const songId = defineModel<SongId>('songId', { required: true })
const startOffset = defineModel<number>('startOffset', { required: true })
const speed = defineModel<SpeedOption>('speed', { required: true })

const { t } = useI18n()

/* Easiest first — a named list, not a magnitude, so it keeps its own order. */
const songOptions = computed(() =>
  SONG_IDS.map((id) => ({ label: t(`singTheKeys.songs.${id}`), value: id })),
)

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
      <PrimeSelect
        v-model="songId"
        :options="songOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isRunning"
        :ariaLabel="t('singTheKeys.song')"
      />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('doReMi.startTone') }}</label
      >
      <StartToneSelect
        v-model:startOffset="startOffset"
        :defaultOffset="DEFAULT_START_OFFSET"
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
  @apply md:grid-cols-[auto_1fr_auto_1fr];
}
</style>

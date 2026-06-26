<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { ALLOWED_BPMS, CLEF_LABEL_KEYS } from './notesConstants'

type Props = {
  /* True while a sequence is playing or paused — the selects stay locked so the
   * running timeline can't be changed underneath it. */
  isRunning: boolean
  /* Show the tone-sound (timbre) select. The "Sing live" tab hides it — there is
   * no playback there, so the timbre choice is meaningless. */
  showToneMode?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showToneMode: true,
})

const clefIndex = defineModel<number>('clefIndex', { required: true })
const bpm = defineModel<number>('bpm', { required: true })

const { t } = useI18n()

const clefOptions = computed(() =>
  CLEF_LABEL_KEYS.map((key, index) => ({
    label: t(`notes.clefLabels.${key}`),
    value: index,
  })),
)

const bpmOptions = [...ALLOWED_BPMS]
  .sort((a, b) => b - a)
  .map((value) => ({
    label: `${value} BPM`,
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
      debugLog('[Notes] warmUp on tone-mode change failed', error),
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
    :class="{
      'mask-start': canScrollStart,
      'mask-end': canScrollEnd,
      'no-tone': !props.showToneMode,
    }"
  >
    <div class="settings-item">
      <div />
      <PrimeSelectButton
        v-model="clefIndex"
        :options="clefOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        :disabled="props.isRunning"
        size="small"
      />
    </div>

    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('notes.tempo')
      }}</label>
      <PrimeSelect
        v-model="bpm"
        :options="bpmOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isRunning"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('notes.tempo') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div v-if="props.showToneMode" class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) lg:block">{{
        t('sounds.toneSound')
      }}</label>
      <ToneModeSelect v-model="toneMode" />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* One row from md up: 6 columns so all three items (each col-span-2) sit side by side. */
.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr];
}

/* The "Sing live" tab hides the tone-sound select — two items remain, so drop
   to 4 columns to center them without two phantom trailing columns. */
.settings-row.no-tone {
  @apply md:grid-cols-[auto_1fr_auto_1fr];
}
</style>

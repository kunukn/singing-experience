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
  /* Show the note-names toggle. Both tabs render the labels, so it defaults on. */
  showToneLabelToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showToneMode: true,
  showToneLabelToggle: true,
})

const clefIndex = defineModel<number>('clefIndex', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  default: false,
})

const { t } = useI18n()

const clefOptions = computed(() =>
  CLEF_LABEL_KEYS.map((key, index) => ({
    label: t(`notes.clefLabels.${key}`),
    value: index,
  })),
)

const bpmOptions = ALLOWED_BPMS.sort((a, b) => b - a).map((value) => ({
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
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('notes.clef')
      }}</label>
      <PrimeSelect
        v-model="clefIndex"
        :options="clefOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isRunning"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('notes.clef') }}
          </div>
        </template>
      </PrimeSelect>
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

    <div v-if="props.showToneLabelToggle" class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('notes.toneLabels')
      }}</label>
      <PrimeToggleSwitch v-model="areToneLabelsShown" />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

.settings-row {
  @apply flex w-full snap-x snap-mandatory items-center justify-center-safe gap-4 overflow-x-auto px-6 pb-2;
  @apply sm:mb-4;
  /* One row from md up: 8 columns so all four items (each col-span-2) sit side by side. */
  @apply md:grid md:w-auto md:snap-none md:grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr] md:overflow-visible md:px-0 md:pb-0;

  /* Match the container's px-6 so snap-start aligns the first/last item at scrollLeft 0/max,
     keeping the conditional edge mask in sync with the true scroll boundaries. */
  scroll-padding-inline: 1.5rem;
}

/* The "Sing live" tab hides the tone-sound select — three items remain, so drop
   to 6 columns to center them without two phantom trailing columns. */
.settings-row.no-tone {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr];
}

/* Edge fade — signals horizontal scrollability on iOS where scrollbars auto-hide.
   Applied only on the side(s) that can actually be scrolled toward. */
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

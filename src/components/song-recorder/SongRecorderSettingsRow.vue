<script setup lang="ts">
import {
  CLEF_LABEL_KEYS,
  type ClefKey,
} from '@/components/notes/notesConstants'
import {
  ALLOWED_BPMS,
  GRID_OPTIONS,
  INPUT_OPTIONS,
  type Grid,
  type SongRecorderInput,
} from './songRecorderConstants'

type Props = {
  /* What the take records — fixed from count-in until the take stops. */
  isInputLocked: boolean
  /* Tempo and click are baked into a take — locked from count-in onwards. */
  isTempoLocked: boolean
  /* Grid re-quantizes the kept take, but not under running playback. */
  isGridLocked: boolean
}

const props = defineProps<Props>()

const input = defineModel<SongRecorderInput>('input', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const grid = defineModel<Grid>('grid', { required: true })
/* Display only — redraws the same take, so it stays unlocked throughout. */
const clef = defineModel<ClefKey>('clef', { required: true })
const isClickEnabled = defineModel<boolean>('isClickEnabled', {
  required: true,
})

const { t } = useI18n()

const inputLabelKeys: Record<SongRecorderInput, string> = {
  voice: 'songRecorder.inputVoice',
  piano: 'songRecorder.inputPiano',
}

const inputOptions = computed(() =>
  INPUT_OPTIONS.map((value) => ({ label: t(inputLabelKeys[value]), value })),
)

/* Same treble/bass switch and labels as the /notes settings row. */
const clefOptions = computed(() =>
  CLEF_LABEL_KEYS.map((key) => ({
    label: t(`notes.clefLabels.${key}`),
    value: key,
  })),
)

const bpmOptions = [...ALLOWED_BPMS]
  .sort((a, b) => b - a)
  .map((value) => ({ label: `${value} BPM`, value }))

/* 1/16 above 1/8 — finer grid = more steps per bar (largest first). */
const gridOptions = GRID_OPTIONS.map((value) => ({
  label: `1/${value}`,
  value,
}))

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
    }"
  >
    <div class="settings-item">
      <div />
      <PrimeSelectButton
        v-model="input"
        :options="inputOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :disabled="props.isInputLocked"
        :aria-label="t('songRecorder.inputLabel')"
        data-testid="song-recorder-input"
      />
    </div>

    <div class="settings-item">
      <div />
      <PrimeSelectButton
        v-model="clef"
        :options="clefOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        data-testid="song-recorder-clef"
      />
    </div>

    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.tempo')
      }}</label>
      <PrimeSelect
        v-model="bpm"
        :options="bpmOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isTempoLocked"
        data-testid="song-recorder-bpm"
      />
    </div>

    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('songRecorder.grid')
      }}</label>
      <PrimeSelect
        v-model="grid"
        :options="gridOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isGridLocked"
        data-testid="song-recorder-grid"
      />
    </div>

    <div class="settings-item">
      <div />
      <ToggleIconButton
        v-model="isClickEnabled"
        iconOn="pi pi-stopwatch"
        iconOff="pi pi-stopwatch"
        :label="t('generic.beat')"
        :disabled="props.isTempoLocked"
        class="justify-self-start"
      />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* One row from md up: five items (each col-span-2) side by side. All auto,
 * not 1fr: in this content-sized grid, 1fr tracks all grow to the widest
 * one, which stretched short selects like Shortest note to Tempo's width. */
.settings-row {
  @apply md:grid-cols-[repeat(10,auto)];
}
</style>

<script setup lang="ts">
import {
  CLEF_LABEL_KEYS,
  type ClefKey,
} from '@/components/notes/notesConstants'
import type { ToneMode } from '@/composables/toneEngine'
import {
  ALLOWED_BPMS,
  GRID_OPTIONS,
  INPUT_OPTIONS,
  type Grid,
  type MelodyWriterInput,
} from './melodyWriterConstants'

type Props = {
  /* What the take records — fixed from count-in until the take stops. */
  isInputLocked: boolean
  /* Tempo and click are baked into a take — locked from count-in onwards. */
  isTempoLocked: boolean
  /* Grid re-quantizes the kept take, but not under running playback. */
  isGridLocked: boolean
}

const props = defineProps<Props>()

const input = defineModel<MelodyWriterInput>('input', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const grid = defineModel<Grid>('grid', { required: true })
/* Display only — redraws the same take, so it stays unlocked throughout. */
const clef = defineModel<ClefKey>('clef', { required: true })
const isClickEnabled = defineModel<boolean>('isClickEnabled', {
  required: true,
})

const { t } = useI18n()

const inputLabelKeys: Record<MelodyWriterInput, string> = {
  voice: 'melodyWriter.inputVoice',
  piano: 'melodyWriter.inputPiano',
}

const inputOptions = computed(() =>
  INPUT_OPTIONS.map((value) => ({ label: t(inputLabelKeys[value]), value })),
)

/* Same treble/bass switch as the /notes settings row. */
const clefOptions = computed(() =>
  CLEF_LABEL_KEYS.map((key) => ({
    label: t(`notes.clefLabels.${key}`),
    clef: key,
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

/* Tone-mode selector — mirrors PianoSettingsRow. Never locked: playback and
 * the piano read the mode per note, so a change only affects later notes.
 * Re-warm the AudioContext inside the user-gesture frame so iOS Safari doesn't
 * silently refuse a later resume. */
const { setToneMode, warmUp } = useTonePlayer()
const { toneMode: storedToneMode } = storeToRefs(useToneModeStore())
const toneMode = computed<ToneMode>({
  get: () => storedToneMode.value,
  set: (mode) => {
    storedToneMode.value = mode
    setToneMode(mode)
    void warmUp().catch((error) =>
      debugLog('[TonePlayer] warmUp on tone-mode change failed', error),
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
    }"
  >
    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('melodyWriter.inputLabel')
      }}</label>
      <PrimeSelectButton
        v-model="input"
        :options="inputOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :disabled="props.isInputLocked"
        :aria-label="t('melodyWriter.inputLabel')"
        data-testid="melody-writer-input"
      />
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('sounds.toneSound')
      }}</label>
      <ToneModeSelect
        v-model="toneMode"
        data-testid="melody-writer-tone-mode"
      />
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.clef')
      }}</label>
      <PrimeSelectButton
        v-model="clef"
        :options="clefOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :aria-label="t('generic.clef')"
        data-testid="melody-writer-clef"
      >
        <template #option="{ option }">
          <ClefOption :clef="option.clef" :label="option.label" />
        </template>
      </PrimeSelectButton>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.tempo')
      }}</label>
      <PrimeSelect
        v-model="bpm"
        :options="bpmOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isTempoLocked"
        :ariaLabel="t('generic.tempo')"
        data-testid="melody-writer-bpm"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.tempo') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('melodyWriter.grid')
      }}</label>
      <PrimeSelect
        v-model="grid"
        :options="gridOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isGridLocked"
        :ariaLabel="t('melodyWriter.grid')"
        data-testid="melody-writer-grid"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('melodyWriter.grid') }}
          </div>
        </template>
      </PrimeSelect>
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

/* Six items (each col-span-2), 3 per row at every width from md up, like the
 * warm-up row. No single-row layout on wide screens: with labels one row is
 * ~950–1200px across locales, far wider than the sheet beneath it.
 * All auto, not 1fr: in this content-sized grid, 1fr tracks all grow to the
 * widest one, which stretched short selects like Grid to Tempo's width. */
.settings-row {
  @apply md:grid-cols-[repeat(6,auto)] md:gap-3;
}
</style>

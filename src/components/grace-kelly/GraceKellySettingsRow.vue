<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import { midiToNoteLabel } from '@/utils/noteUtils'
import {
  ALLOWED_BPMS,
  START_TONE_MIDI_MAX,
  START_TONE_MIDI_MIN,
  VOZ_LABEL_KEYS,
} from './graceKellyConstants'

type Props = {
  /* True while a sequence is playing or paused — the selects stay locked so the
   * running timeline can't be changed underneath it. */
  isRunning: boolean
  /* Show the single-voice (Voz) select. The harmony tab hides it — it picks
   * voices via per-part toggles instead. */
  showVoz?: boolean
  /* Show the tone-sound (timbre) select. The "Sing live" tab hides it — there
   * is no playback there, so the timbre choice is meaningless. */
  showToneMode?: boolean
  /* Show the note-names toggle. The Sing-along / Sing-live tabs (GraceKellySingSheet)
   * and the Harmony tab (GraceKellyAllSheets) pass true — those sheets render the
   * labels. */
  showToneLabelToggle?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showVoz: true,
  showToneMode: true,
  showToneLabelToggle: false,
})

const vozIndex = defineModel<number>('vozIndex')
const startToneMidi = defineModel<number>('startToneMidi', { required: true })
const bpm = defineModel<number>('bpm', { required: true })
const areToneLabelsShown = defineModel<boolean>('areToneLabelsShown', {
  default: false,
})

const { t } = useI18n()

const vozOptions = computed(() =>
  VOZ_LABEL_KEYS.map((key, index) => ({
    label: t(`graceKelly.vozLabels.${key}`),
    value: index,
  })),
)

/* Start-tone options, descending (high → low), built from the shared range.
 * Generated locally because the shared START_TONE_OPTIONS bottoms out at G2. */
const startToneOptions = Array.from(
  { length: START_TONE_MIDI_MAX - START_TONE_MIDI_MIN + 1 },
  (_, index) => {
    const midiNote = START_TONE_MIDI_MAX - index

    return { label: midiToNoteLabel(midiNote).label, midiNote }
  },
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
      debugLog('[GraceKelly] warmUp on tone-mode change failed', error),
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
      'no-voz': !props.showVoz,
      'no-tone': !props.showToneMode,
      'has-toggle': props.showToneLabelToggle,
    }"
  >
    <div v-if="props.showVoz" class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('graceKelly.voz')
      }}</label>
      <PrimeSelect
        v-model="vozIndex"
        :options="vozOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        :disabled="props.isRunning"
        scrollHeight="370px"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.voz') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('graceKelly.startTone')
      }}</label>
      <PrimeSelect
        v-model="startToneMidi"
        :options="startToneOptions"
        optionLabel="label"
        optionValue="midiNote"
        size="small"
        :disabled="props.isRunning"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('graceKelly.startTone') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('graceKelly.tempo')
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
            {{ t('graceKelly.tempo') }}
          </div>
        </template>
      </PrimeSelect>
    </div>

    <div v-if="props.showToneMode" class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) lg:block">{{
        t('sounds.toneSound')
      }}</label>
      <ToneModeSelect v-model="toneMode" class="md:max-lg:col-span-2" />
    </div>

    <div v-if="props.showToneLabelToggle" class="settings-item">
      <label class="text-sm text-(--p-text-muted-color) md:block">{{
        t('graceKelly.toneLabels')
      }}</label>
      <PrimeToggleSwitch v-model="areToneLabelsShown" />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* One row from md up: 8 columns so all four items (each col-span-2) sit side by side. */
.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr];
}

/* Harmony tab hides the Voz select, the Sing-live tab hides the tone-sound
 * select — either way three items remain, so drop to 6 columns to center them
 * without two phantom trailing columns pulling them off-center. */
.settings-row.no-voz,
.settings-row.no-tone {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr];
}

/* The note-names toggle adds a fifth item → 10 columns ("Sing along"). */
.settings-row.has-toggle {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr];
}

/* "Sing live" hides the tone-sound select but keeps the toggle → four items, so
 * 8 columns. More specific than the .no-tone 6-col rule above, so it wins. */
.settings-row.has-toggle.no-tone {
  @apply md:grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr];
}
</style>

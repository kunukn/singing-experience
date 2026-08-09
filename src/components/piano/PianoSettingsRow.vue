<script setup lang="ts">
import type { AccidentalStyle } from '@/composables/accidentalStyle'
import type { ToneMode } from '@/composables/toneEngine'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { VOICE_RANGES } from '@/constants/voiceRanges'
import { useMediaQuery } from '@vueuse/core'

type Props = {
  /* Both mic toggles lock out once permission was refused. Matches the shape of
   * useIdlePreview's micPermission — useMicrophonePermission keeps its own
   * alias private, so the union is spelled out here. */
  micPermission: PermissionState | null
}
defineProps<Props>()

const rangeIndex = defineModel<number>('rangeIndex', { required: true })
const toneLabelMode = defineModel<ToneLabelMode>('toneLabelMode', {
  required: true,
})
const accidentalStyle = defineModel<AccidentalStyle>('accidentalStyle', {
  required: true,
})
const isPreviewEnabled = defineModel<boolean>('isPreviewEnabled', {
  required: true,
})
const isDuetEnabled = defineModel<boolean>('isDuetEnabled', { required: true })
const areKeyboardHintsVisible = defineModel<boolean>(
  'areKeyboardHintsVisible',
  {
    required: true,
  },
)

/* The chips are only ever drawn where a physical keyboard exists (see keyChar
 * in PianoDisplay), so on touch the toggle would be a no-op control. */
const isCoarsePointer = useMediaQuery('(pointer: coarse)')

const { t } = useI18n()

const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)

const toneLabelModeOptions = useToneLabelModeOptions()

/* Tone-mode selector — mirrors PitchDetectorDisplay. Re-warm the AudioContext
 * inside the user-gesture frame so iOS Safari doesn't silently refuse a later
 * resume. */
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
    :class="{ 'mask-start': canScrollStart, 'mask-end': canScrollEnd }"
  >
    <div class="settings-item">
      <label class="hidden text-sm text-(--p-text-muted-color) md:block">{{
        t('generic.voiceRange')
      }}</label>
      <PrimeSelect
        v-model="rangeIndex"
        :options="rangeOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.voiceRange') }}
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

    <!-- The toggles share one item: ToggleIconButton prints its own label from
         md up (icon-only below), so the item's label track stays empty — the
         placeholder div keeps the subgrid pairs aligned with the other items. -->
    <div class="settings-item">
      <div />
      <div class="flex items-center gap-2">
        <PreviewToggle
          v-model="isPreviewEnabled"
          :disabled="micPermission === 'denied'"
        />

        <DuetToggle
          v-model="isDuetEnabled"
          :disabled="!isPreviewEnabled || micPermission === 'denied'"
        />

        <KeyboardHintsToggle
          v-if="!isCoarsePointer"
          v-model="areKeyboardHintsVisible"
        />
      </div>
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('notes.toneLabels') }}</label
      >
      <PrimeSelectButton
        v-model="toneLabelMode"
        :options="toneLabelModeOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :aria-label="t('notes.toneLabels')"
      />
    </div>

    <div class="settings-item">
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block"
        >{{ t('notes.accidentals') }}</label
      >
      <PrimeSelectButton
        v-model="accidentalStyle"
        :options="ACCIDENTAL_STYLE_OPTIONS"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        size="small"
        :aria-label="t('notes.accidentals')"
        data-testid="piano-accidentals"
      />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/*
 * Five items (each col-span-2), and five never divides evenly, so the row steps
 * up a breakpoint at a time: 2 per row at md, 3 at lg, all five from xl. Fitting
 * more sooner would push the whole document into a horizontal scrollbar — the
 * piano's items are wider than the guitar row's, which manages 4 per row at lg.
 *
 * Every track is `auto`, never `1fr`: the row is content-sized (md:w-auto), so a
 * grid of `1fr` tracks resolves one shared flex fraction from the widest control
 * and stretches all the others to match it — the narrow tone/accidental button
 * pairs would sit in columns as wide as the voice-range select, leaving a gap
 * between each control and the next item's label. `auto` still aligns a column
 * down the rows; it just stops columns matching each other.
 */
.settings-row {
  @apply md:grid-cols-[repeat(4,auto)];
  @apply lg:grid-cols-[repeat(6,auto)];
  @apply xl:grid-cols-[repeat(10,auto)];
}
</style>

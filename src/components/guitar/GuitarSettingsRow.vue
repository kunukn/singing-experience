<script setup lang="ts">
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import type { GuitarTuningId } from '@/utils/guitarTunings'
import {
  ACCIDENTAL_STYLE_OPTIONS,
  type AccidentalStyle,
} from './guitarAccidentals'

type Props = {
  /* Both mic toggles lock out once permission was refused. Matches the shape of
   * useIdlePreview's micPermission — useMicrophonePermission keeps its own
   * alias private, so the union is spelled out here. */
  micPermission: PermissionState | null
}
defineProps<Props>()

/* No voice-range selector, unlike the piano row: the board's span follows the
 * tuning, so a separate range control would only fight it. */
const tuningId = defineModel<GuitarTuningId>('tuningId', { required: true })

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

const { t } = useI18n()

const toneLabelModeOptions = useToneLabelModeOptions()

/* No tone-sound selector, unlike the piano row: the fretboard always plays the
 * sampled acoustic guitar (see useGuitarFretPlayback), so letting the user turn
 * it into a bell or a bass would be a different instrument. */

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
      <label
        class="hidden text-end text-sm text-(--p-text-muted-color) md:block md:min-w-22.5"
        >{{ t('tuner.tuning') }}</label
      >
      <GuitarTuningSelect v-model:tuningId="tuningId" />
    </div>

    <!-- Both toggles share one item: ToggleIconButton prints its own label from
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
        data-testid="guitar-accidentals"
      />
    </div>
  </div>
</template>

<style scoped>
@reference '@/style.css';

/*
 * Four items (each col-span-2). All four side by side need ~810px, which does
 * not fit the content area until about lg — at md the row would push the whole
 * document into a horizontal scrollbar. So: 2×2 at md, like the piano row's four
 * items, then one row from lg up.
 */
.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr];
  @apply lg:grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr];
}
</style>

<script setup lang="ts">
import type { ToneMode } from '@/composables/toneEngine'
import type { ToneLabelMode } from '@/composables/toneLabelMode'
import { VOICE_RANGES } from '@/constants/voiceRanges'

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
const isPreviewEnabled = defineModel<boolean>('isPreviewEnabled', {
  required: true,
})
const isDuetEnabled = defineModel<boolean>('isDuetEnabled', { required: true })

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
  </div>
</template>

<style scoped>
@reference '@/style.css';

/* Four items × 2 tracks each; the 4-column template wraps them into 2 × 2. */
.settings-row {
  @apply md:grid-cols-[auto_1fr_auto_1fr];
}
</style>

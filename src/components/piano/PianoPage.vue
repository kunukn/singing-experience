<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core'
import type { ToneMode } from '@/composables/toneEngine'
import { VOICE_RANGES, DEFAULT_RANGE_INDEX } from '@/constants/voiceRanges'

const { t } = useI18n()

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

/* Voice-range selector */
const rangeIndex = useLocalStorage('syng.rangeIndex', DEFAULT_RANGE_INDEX)
if (
  typeof rangeIndex.value !== 'number' ||
  !Number.isInteger(rangeIndex.value) ||
  rangeIndex.value < 0 ||
  rangeIndex.value >= VOICE_RANGES.length
) {
  rangeIndex.value = DEFAULT_RANGE_INDEX
}
const rangeOptions = computed(() =>
  VOICE_RANGES.map((range, index) => ({
    label: `${t(range.labelKey)} (${range.noteRange})`,
    value: index,
  })),
)
const selectedRange = computed(() => VOICE_RANGES[rangeIndex.value])

/* Preview toggle — persist-only. Read mic permission cheaply (no stream opened)
 * just to disable the toggle when the mic is blocked. */
const { isPreviewEnabled } = useSettings()
const { state: micPermission } = useMicrophonePermission()
</script>

<template>
  <div class="flex flex-1 flex-col items-center gap-4" data-testid="piano-page">
    <div class="flex w-full flex-wrap items-center gap-2 sm:gap-4">
      <PrimeSelect
        v-model="rangeIndex"
        :options="rangeOptions"
        optionLabel="label"
        optionValue="value"
        size="small"
        class="flex-1"
      >
        <template #header>
          <div
            class="px-3 py-2 text-xs font-medium text-(--p-text-muted-color)"
          >
            {{ t('generic.voiceRange') }}
          </div>
        </template>
      </PrimeSelect>

      <ToneModeSelect v-model="toneMode" class="min-w-30 flex-1" />

      <PreviewToggle
        v-model="isPreviewEnabled"
        :disabled="micPermission === 'denied'"
      />
    </div>

    <PianoDisplay
      :midiMin="selectedRange.midiMin"
      :midiMax="selectedRange.midiMax"
    />
  </div>
</template>

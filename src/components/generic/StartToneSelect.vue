<script setup lang="ts">
import { START_TONE_GROUPS } from '@/utils/noteUtils'

/* Start-tone picker shared by the games that transpose a melody or scale from a
 * chosen tonic (Do-Re-Mi, Sing the Keys). Options come from START_TONE_GROUPS
 * (G4 down to G2, grouped by voice tier); the value is the semitone offset from
 * C3, so the caller's tonic MIDI is C3_MIDI + startOffset. */
type Props = {
  /* The option marked with a ⭐ — the caller's recommended default. */
  defaultOffset?: number
  disabled?: boolean
}

const props = defineProps<Props>()

const startOffset = defineModel<number>('startOffset', { required: true })

const { t } = useI18n()
</script>

<template>
  <PrimeSelect
    v-model="startOffset"
    :options="START_TONE_GROUPS"
    optionLabel="label"
    optionValue="offset"
    optionGroupLabel="voiceTier"
    optionGroupChildren="items"
    size="small"
    scrollHeight="370px"
    :disabled="props.disabled"
    :ariaLabel="t('doReMi.startTone')"
  >
    <template #header>
      <div class="p-3 text-sm font-medium">
        {{ t('doReMi.pickToneHeader') }}
      </div>
    </template>
    <template #optiongroup="{ index, option }">
      <div
        :data-index="index + 1"
        class="select-start-tone-option-group flex items-center"
        :class="{ 'mt-4': index !== 0 }"
      >
        <div>{{ t(`doReMi.voiceTier.${option.voiceTier}`) }}</div>
      </div>
    </template>
    <template #option="{ option }">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center font-medium">
          <span class="block min-w-8">
            {{ option.label }}
          </span>
          <span v-if="option.offset === props.defaultOffset" class="ms-1"
            >⭐</span
          >
        </div>
      </div>
    </template>
    <template #footer>
      <div class="p-3 text-xs text-(--p-text-muted-color)">
        {{ t('doReMi.pickToneFooter') }}
      </div>
    </template>
  </PrimeSelect>
</template>

<style scoped>
.select-start-tone-option-group {
  color: var(--p-primary-color);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
</style>

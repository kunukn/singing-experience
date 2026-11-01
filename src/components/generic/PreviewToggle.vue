<script setup lang="ts">
import type { ToggleLabelFrom } from './toggleIconButton'

type Props = {
  disabled?: boolean
  /* When "See my voice" shows as text; each page decides (see ToggleIconButton) */
  labelFrom?: ToggleLabelFrom
}

defineProps<Props>()
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-microphone"
    iconOff="pi pi-microphone"
    :label="t('generic.previewSoundLabel')"
    :disabled="disabled"
    :labelFrom="labelFrom"
  />
</template>

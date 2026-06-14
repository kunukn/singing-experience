<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-stopwatch"
    iconOff="pi pi-stopwatch"
    :label="t('graceKelly.metronome')"
    :disabled="disabled"
  />
</template>

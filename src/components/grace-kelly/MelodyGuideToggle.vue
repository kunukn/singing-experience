<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-volume-up"
    iconOff="pi pi-volume-off"
    :label="t('graceKelly.melodyGuide')"
    :disabled="disabled"
  />
</template>

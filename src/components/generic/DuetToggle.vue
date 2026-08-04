<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-users"
    iconOff="pi pi-users"
    :label="t('generic.duetPreviewLabel')"
    :disabled="disabled"
  />
</template>

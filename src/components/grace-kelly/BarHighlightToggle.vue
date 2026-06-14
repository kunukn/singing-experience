<script setup lang="ts">
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-eye"
    iconOff="pi pi-eye-slash"
    :label="t('graceKelly.barHighlight')"
  />
</template>

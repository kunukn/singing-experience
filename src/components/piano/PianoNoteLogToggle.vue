<script setup lang="ts">
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-list"
    iconOff="pi pi-list"
    :label="t('generic.noteLogLabel')"
    isLabelHidden
  />
</template>

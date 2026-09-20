<script setup lang="ts">
defineProps<{ disabled?: boolean }>()
const modelValue = defineModel<boolean>({ required: true })
const { t } = useI18n()
</script>

<template>
  <!--
    Label reuses the voice-range select's own group heading rather than a new
    key: it is the same concept, already translated in every locale.

    Kept icon-only everywhere. Both rows that carry this toggle have already
    spent their width — the pitch detector's is 736px at max-w-3xl with two
    labelled toggles and a Start button, the piano's already wraps to three
    rows below 2xl — so a third label pushes something onto its own line. The
    name still reaches screen readers and the tooltip via aria-label/title.
  -->
  <ToggleIconButton
    v-model="modelValue"
    iconOn="pi pi-eye"
    iconOff="pi pi-eye-slash"
    :label="t('voiceRanges.groups.voiceTypes')"
    :disabled="disabled"
    isLabelHidden
  />
</template>

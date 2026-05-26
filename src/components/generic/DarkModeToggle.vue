<script setup lang="ts">
const { t } = useI18n()
const { isDark, toggleDark } = useDarkMode()
</script>

<template>
  <PrimeButton
    :aria-label="t('generic.toggleDarkMode')"
    :title="t('generic.toggleDarkMode')"
    text
    rounded
    size="default"
    class="aspect-square max-h-10 text-lg"
    @click="toggleDark"
  >
    <span
      class="border-radius-50% flex aspect-square h-full items-center justify-center"
    >
      {{ isDark ? t('generic.darkMode') : t('generic.lightMode') }}
    </span>
  </PrimeButton>
</template>

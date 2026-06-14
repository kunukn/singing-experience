<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <footer
    class="relative mt-auto flex w-full max-w-lg items-end justify-center gap-3 overflow-hidden pt-4 pb-4 text-sm text-(--p-text-muted-color)"
  >
    <span>{{ t('home.privacy') }}</span>
  </footer>
</template>

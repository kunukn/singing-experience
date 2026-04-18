<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const isHome = computed(() => route.path === '/')
</script>

<template>
  <div class="mb-2 flex items-center justify-between">
    <RouterLink
      v-if="!isHome"
      to="/"
      class="text-sm text-gray-400 transition-colors hover:text-white"
    >
      {{ t('generic.backToMenu') }}
    </RouterLink>
    <div v-else />
    <LanguageSwitcher />
  </div>
</template>
